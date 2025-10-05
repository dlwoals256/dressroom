import React, { useEffect, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import PageLayout from '../components/PageLayout.jsx'

const API_BASE = 'https://dressroom-service-95829378695.us-central1.run.app/api'

const DashboardPage = () => {
  const [user, setUser] = useState(null)
  const [shops, setShops] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [showShopForm, setShowShopForm] = useState(false)
  const [shopId, setShopId] = useState('')
  const [shopName, setShopName] = useState('')
  const [shopLoading, setShopLoading] = useState(false)
  const [shopError, setShopError] = useState('')
  const navigate = useNavigate()

  const access = localStorage.getItem('access')

  useEffect(() => {
    if (!access) {
      navigate('/login')
      return
    }

    const fetchData = async () => {
      setLoading(true)
      setError('')
      try {
        const userRes = await fetch(`${API_BASE}/whoami/`, {
          headers: { Authorization: `Bearer ${access}` }
        })
        if (!userRes.ok) throw new Error('회원 정보를 불러올 수 없습니다. 다시 로그인해 주세요.')
        const userData = await userRes.json()
        setUser(userData)

        const shopRes = await fetch(`${API_BASE}/shops/`, {
          headers: { Authorization: `Bearer ${access}` }
        })
        if (!shopRes.ok) throw new Error('상점 정보를 불러오는 중 문제가 발생했습니다.')
        const shopData = await shopRes.json()
        setShops(shopData)
      } catch (err) {
        setError(err.message)
      } finally {
        setLoading(false)
      }
    }

    fetchData()
  }, [access, navigate])

  const refreshShops = async () => {
    const shopRes = await fetch(`${API_BASE}/shops/`, {
      headers: { Authorization: `Bearer ${access}` }
    })
    if (shopRes.ok) {
      const shopData = await shopRes.json()
      setShops(shopData)
    }
  }

  const handleShopSubmit = async (e) => {
    e.preventDefault()
    setShopLoading(true)
    setShopError('')

    try {
      const res = await fetch(`${API_BASE}/shops/`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${access}`
        },
        body: JSON.stringify({ shop_id: shopId, shop_name: shopName })
      })

      if (!res.ok) {
        const err = await res.json()
        throw new Error(err.error || '상점 등록에 실패했습니다.')
      }

      setShopId('')
      setShopName('')
      setShowShopForm(false)
      await refreshShops()
    } catch (err) {
      setShopError(err.message)
    } finally {
      setShopLoading(false)
    }
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
                <span className="summary-card__label">전화번호</span>
                <span className="summary-card__value">{user.phone || '등록되지 않음'}</span>
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
                {shops.map((shop) => (
                  <li key={shop.shop_id} className="shop-list__item">
                    <Link className="shop-link" to={`/shops/${shop.shop_id}`}>
                      {shop.shop_name}
                    </Link>
                    <span className="shop-meta">상점 ID · {shop.shop_id}</span>
                  </li>
                ))}
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
