import React, { useEffect, useMemo, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import PageLayout from '../components/PageLayout.jsx'
import { API_BASE } from '../config.js'

const DashboardPage = () => {
  const [user, setUser] = useState(null)
  const [shops, setShops] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [showShopForm, setShowShopForm] = useState(false)
  const [shopId, setShopId] = useState('')
  const [shopName, setShopName] = useState('')
  const [companyName, setCompanyName] = useState('')
  const [businessNumber, setBusinessNumber] = useState('')
  const [contactPhone, setContactPhone] = useState('')
  const [shopLoading, setShopLoading] = useState(false)
  const [shopError, setShopError] = useState('')
  const [usageCache, setUsageCache] = useState({})
  const [usageLoading, setUsageLoading] = useState({})
  const [adjustForms, setAdjustForms] = useState({})
  const navigate = useNavigate()

  const access = useMemo(() => localStorage.getItem('access'), [])

  useEffect(() => {
    if (!access) {
      navigate('/login')
      return
    }

    const fetchData = async () => {
      setLoading(true)
      setError('')
      try {
        const headers = { Authorization: `Bearer ${access}` }
        const [userRes, shopRes] = await Promise.all([
          fetch(`${API_BASE}/whoami/`, { headers }),
          fetch(`${API_BASE}/shops/`, { headers })
        ])

        if (!userRes.ok) throw new Error('회원 정보를 불러올 수 없습니다. 다시 로그인해 주세요.')
        if (!shopRes.ok) throw new Error('상점 정보를 불러오는 중 문제가 발생했습니다.')

        const userData = await userRes.json()
        const shopData = await shopRes.json()

        setUser(userData)
        setShops(shopData)
        primeUsageCache(shopData)
      } catch (err) {
        setError(err.message)
      } finally {
        setLoading(false)
      }
    }

    const primeUsageCache = (shopList) => {
      setUsageCache((prev) => {
        const next = { ...prev }
        shopList.forEach((shop) => {
          if (shop.current_month_usage) {
            next[shop.shop_id] = {
              summary: shop.current_month_usage,
              entries: prev[shop.shop_id]?.entries ?? null,
            }
          }
        })
        return next
      })
    }

    fetchData()
  }, [access, navigate])

  const headers = useMemo(() => ({ Authorization: `Bearer ${access}` }), [access])

  const refreshShops = async () => {
    try {
      const res = await fetch(`${API_BASE}/shops/`, { headers })
      if (res.ok) {
        const data = await res.json()
        setShops(data)
        setUsageCache((prev) => {
          const next = { ...prev }
          data.forEach((shop) => {
            if (shop.current_month_usage) {
              next[shop.shop_id] = {
                summary: shop.current_month_usage,
                entries: prev[shop.shop_id]?.entries ?? null,
              }
            }
          })
          return next
        })
      }
    } catch (err) {
      console.error(err)
    }
  }

  const handleShopSubmit = async (e) => {
    e.preventDefault()
    setShopLoading(true)
    setShopError('')

    try {
      const payload = {
        shop_id: shopId.trim(),
        shop_name: shopName.trim(),
        company_name: companyName.trim(),
        business_registration_number: businessNumber.replace(/[^0-9]/g, ''),
        contact_phone: contactPhone.trim(),
      }

      const res = await fetch(`${API_BASE}/shops/`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...headers,
        },
        body: JSON.stringify(payload)
      })

      if (!res.ok) {
        const err = await res.json()
        throw new Error(err.error || Object.values(err)[0] || '상점 등록에 실패했습니다.')
      }

      setShopId('')
      setShopName('')
      setCompanyName('')
      setBusinessNumber('')
      setContactPhone('')
      setShowShopForm(false)
      await refreshShops()
    } catch (err) {
      setShopError(err.message)
    } finally {
      setShopLoading(false)
    }
  }

  const loadUsageHistory = async (shop) => {
    if (!shop) return
    const key = shop.shop_id
    if (usageLoading[key]) return
    setUsageLoading((prev) => ({ ...prev, [key]: true }))
    try {
      const res = await fetch(`${API_BASE}/shops/${encodeURIComponent(key)}/usage/?limit=6`, { headers })
      if (!res.ok) throw new Error('사용량 기록을 불러오지 못했습니다.')
      const data = await res.json()
      setUsageCache((prev) => ({
        ...prev,
        [key]: {
          summary: prev[key]?.summary ?? shop.current_month_usage ?? null,
          entries: data,
        }
      }))
    } catch (err) {
      setUsageCache((prev) => ({
        ...prev,
        [key]: {
          summary: prev[key]?.summary ?? shop.current_month_usage ?? null,
          entries: [{ id: 'error', error: err.message }],
        }
      }))
    } finally {
      setUsageLoading((prev) => ({ ...prev, [key]: false }))
    }
  }

  const handleAdjustSubmit = async (shop, e) => {
    e.preventDefault()
    const key = shop.shop_id
    const formState = adjustForms[key]
    if (!formState || !formState.amount) return
    const amount = parseInt(formState.amount, 10)
    if (Number.isNaN(amount) || amount === 0) {
      setAdjustForms((prev) => ({
        ...prev,
        [key]: { ...prev[key], error: '0이 아닌 숫자를 입력해 주세요.' }
      }))
      return
    }
    setAdjustForms((prev) => ({ ...prev, [key]: { ...prev[key], submitting: true, error: '' } }))
    try {
      const res = await fetch(`${API_BASE}/shops/${encodeURIComponent(key)}/adjust_quota/`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...headers,
        },
        body: JSON.stringify({ amount, note: formState.note || '' })
      })
      if (!res.ok) {
        const err = await res.json()
        throw new Error(err.error || Object.values(err)[0] || '조정에 실패했습니다.')
      }
      await refreshShops()
      setAdjustForms((prev) => ({ ...prev, [key]: { amount: '', note: '', submitting: false, error: '' } }))
    } catch (err) {
      setAdjustForms((prev) => ({ ...prev, [key]: { ...prev[key], submitting: false, error: err.message } }))
    }
  }

  const handleAdjustChange = (shopIdKey, field, value) => {
    setAdjustForms((prev) => ({
      ...prev,
      [shopIdKey]: {
        amount: prev[shopIdKey]?.amount ?? '',
        note: prev[shopIdKey]?.note ?? '',
        error: prev[shopIdKey]?.error ?? '',
        submitting: prev[shopIdKey]?.submitting ?? false,
        [field]: value,
      }
    }))
  }

  if (loading) {
    return (
      <PageLayout>
        <div className="fullscreen-state">
          <div className="state-card">
            <div className="material-spinner" />
            <p className="state-card__message">대시보드를 불러오는 중입니다…</p>
          </div>
        </div>
      </PageLayout>
    )
  }

  if (error) {
    return (
      <PageLayout>
        <div className="fullscreen-state">
          <div className="state-card">
            <p className="state-card__title">문제가 발생했어요</p>
            <p className="state-card__message">{error}</p>
            <div className="inline-actions">
              <Link className="material-btn-outlined" to="/login">다시 로그인</Link>
            </div>
          </div>
        </div>
      </PageLayout>
    )
  }

  const formatUsage = (shop) => {
    const summary = usageCache[shop.shop_id]?.summary
    if (!summary) return `남은 크레딧 ${shop.count}`
    const { used_requests = 0, quota_snapshot = shop.monthly_quota } = summary
    return `이번 달 사용량 ${used_requests}/${quota_snapshot} · 남은 크레딧 ${shop.count}`
  }

  return (
    <PageLayout>
      <div className="dashboard-shell">
        <div className="dashboard-card">
          <div>
            <h2>내 계정 & 상점</h2>
            <p className="auth-subtext">발급된 토큰으로 연결된 상점을 관리하고 Generate 데모를 실행하세요.</p>
          </div>

          {user && (
            <div className="summary-grid">
              <div className="summary-card">
                <span className="summary-card__label">이메일</span>
                <span className="summary-card__value">{user.email}</span>
              </div>
              <div className="summary-card">
                <span className="summary-card__label">연락처</span>
                <span className="summary-card__value">{user.profile?.phone || '등록되지 않음'}</span>
              </div>
            </div>
          )}

          <section className="shop-section">
            <div className="inline-actions inline-actions--spread">
              <h3 className="section-heading">보유한 상점</h3>
              <button className="material-btn-outlined" onClick={() => setShowShopForm((prev) => !prev)}>
                {showShopForm ? '상점 등록 닫기' : '새 상점 등록'}
              </button>
            </div>

            {shops.length === 0 ? (
              <div className="shop-empty">
                아직 등록된 상점이 없습니다. 첫 번째 상점을 등록하고 데모를 실행해 보세요.
              </div>
            ) : (
              <ul className="shop-list">
                {shops.map((shop) => {
                  const usageState = usageCache[shop.shop_id]
                  const formState = adjustForms[shop.shop_id] || { amount: '', note: '', error: '', submitting: false }
                  return (
                    <li key={shop.shop_id} className="shop-list__item">
                      <div className="shop-list__header">
                        <Link className="shop-link" to={`/shops/${shop.shop_id}`}>
                          {shop.shop_name}
                        </Link>
                        <span className="shop-meta">상점 ID · {shop.shop_id}</span>
                        <span className="shop-meta">사업자번호 · {shop.business_registration_number}</span>
                        <span className="shop-meta">연락처 · {shop.contact_phone}</span>
                        <span className="shop-meta">사용량 · {formatUsage(shop)}</span>
                      </div>
                      <div className="inline-actions inline-actions--spread">
                        <button
                          className="material-btn-outlined"
                          onClick={() => loadUsageHistory(shop)}
                          disabled={usageLoading[shop.shop_id]}
                        >
                          {usageLoading[shop.shop_id] ? '사용량 불러오는 중…' : '사용량 기록 보기'}
                        </button>
                        <form className="quota-form" onSubmit={(e) => handleAdjustSubmit(shop, e)}>
                          <input
                            type="number"
                            className="material-input"
                            placeholder="± 크레딧"
                            value={formState.amount}
                            onChange={(e) => handleAdjustChange(shop.shop_id, 'amount', e.target.value)}
                          />
                          <input
                            type="text"
                            className="material-input"
                            placeholder="관리 메모 (선택)"
                            value={formState.note || ''}
                            onChange={(e) => handleAdjustChange(shop.shop_id, 'note', e.target.value)}
                          />
                          <button className="material-btn" type="submit" disabled={formState.submitting}>
                            {formState.submitting ? '조정 중…' : '쿼터 조정'}
                          </button>
                        </form>
                      </div>
                      {formState.error && <div className="material-error">{formState.error}</div>}
                      {usageState?.entries && (
                        <div className="usage-history">
                          <h4>최근 사용량</h4>
                          {usageState.entries[0]?.error ? (
                            <div className="material-error">{usageState.entries[0].error}</div>
                          ) : (
                            <ul>
                              {usageState.entries.map((entry) => (
                                <li key={entry.id || entry.period_start}>
                                  <span>{entry.period_start}</span>
                                  <span>{entry.used_requests} / {entry.quota_snapshot}</span>
                                </li>
                              ))}
                            </ul>
                          )}
                        </div>
                      )}
                    </li>
                  )
                })}
              </ul>
            )}

            {showShopForm && (
              <form className="shop-form" onSubmit={handleShopSubmit}>
                <div>
                  <label className="material-label" htmlFor="shopId">상점 ID</label>
                  <input
                    id="shopId"
                    type="text"
                    className="material-input"
                    placeholder="예: dressroom-shop-01"
                    value={shopId}
                    onChange={(e) => setShopId(e.target.value)}
                    required
                  />
                </div>
                <div>
                  <label className="material-label" htmlFor="shopName">상점 이름</label>
                  <input
                    id="shopName"
                    type="text"
                    className="material-input"
                    placeholder="Dressroom Mall"
                    value={shopName}
                    onChange={(e) => setShopName(e.target.value)}
                    required
                  />
                </div>
                <div>
                  <label className="material-label" htmlFor="companyName">업체명</label>
                  <input
                    id="companyName"
                    type="text"
                    className="material-input"
                    placeholder="드레스룸 주식회사"
                    value={companyName}
                    onChange={(e) => setCompanyName(e.target.value)}
                    required
                  />
                </div>
                <div>
                  <label className="material-label" htmlFor="businessNumber">사업자등록번호</label>
                  <input
                    id="businessNumber"
                    type="text"
                    className="material-input"
                    placeholder="10자리 숫자"
                    value={businessNumber}
                    onChange={(e) => setBusinessNumber(e.target.value)}
                    required
                  />
                </div>
                <div>
                  <label className="material-label" htmlFor="contactPhone">사업장 연락처</label>
                  <input
                    id="contactPhone"
                    type="tel"
                    className="material-input"
                    placeholder="02-000-0000"
                    value={contactPhone}
                    onChange={(e) => setContactPhone(e.target.value)}
                    required
                  />
                </div>
                <button className="material-btn" type="submit" disabled={shopLoading}>
                  {shopLoading ? '등록 중…' : '상점 등록'}
                </button>
                {shopError && <div className="material-error">{shopError}</div>}
              </form>
            )}
          </section>
        </div>
      </div>
    </PageLayout>
  )
}

export default DashboardPage
