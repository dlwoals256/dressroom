import React, { useEffect, useMemo, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import PageLayout from '../components/PageLayout.jsx'
import { API_BASE } from '../config.js'
import { useTranslation } from 'react-i18next'

const DashboardPage = () => {
  const { t } = useTranslation()

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

    const fetchData = async () => {
      setLoading(true)
      setError('')
      try {
        const headers = { Authorization: `Bearer ${access}` }
        const [userRes, shopRes] = await Promise.all([
          fetch(`${API_BASE}/whoami/`, { headers }),
          fetch(`${API_BASE}/shops/`, { headers })
        ])

        if (!userRes.ok) throw new Error(t('dashboard.errors.fetchUser'))
        if (!shopRes.ok) throw new Error(t('dashboard.errors.fetchShops'))

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

    fetchData()
  }, [access, navigate, t])

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
        const err = await res.json().catch(() => ({}))
        throw new Error(err.error || Object.values(err)[0] || t('dashboard.shopForm.errors.createFail'))
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
      if (!res.ok) throw new Error(t('dashboard.shops.usage.loadError'))
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
        [key]: { ...prev[key], error: t('dashboard.shops.quotaForm.errors.amountInvalid') }
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
        const err = await res.json().catch(() => ({}))
        throw new Error(err.error || Object.values(err)[0] || t('dashboard.shops.quotaForm.errors.adjustFail'))
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

  const formatUsage = (shop) => {
    const summary = usageCache[shop.shop_id]?.summary
    if (!summary) return t('dashboard.shops.usage.remainingOnly', { count: shop.count })
    const { used_requests = 0, quota_snapshot = shop.monthly_quota } = summary
    return t('dashboard.shops.usage.summary', { used: used_requests, quota: quota_snapshot, count: shop.count })
  }

  if (loading) {
    return (
      <PageLayout>
        <div className="fullscreen-state">
          <div className="state-card">
            <div className="material-spinner" />
            <p className="state-card__message">{t('dashboard.loading.message')}</p>
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
            <p className="state-card__title">{t('dashboard.errorView.title')}</p>
            <p className="state-card__message">{error}</p>
            <div className="inline-actions">
              <Link className="material-btn-outlined" to="/login">{t('dashboard.errorView.relogin')}</Link>
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
            <h2>{t('dashboard.header.title')}</h2>
            <p className="auth-subtext">{t('dashboard.header.subtitle')}</p>
          </div>

          {user && (
            <div className="summary-grid">
              <div className="summary-card">
                <span className="summary-card__label">{t('dashboard.user.email')}</span>
                <span className="summary-card__value">{user.email}</span>
              </div>
              <div className="summary-card">
                <span className="summary-card__label">{t('dashboard.user.phone')}</span>
                <span className="summary-card__value">{user.profile?.phone || t('dashboard.user.phoneNotSet')}</span>
              </div>
            </div>
          )}

          <section className="shop-section">
            <div className="inline-actions inline-actions--spread">
              <h3 className="section-heading">{t('dashboard.shops.heading')}</h3>
              <button className="material-btn-outlined" onClick={() => setShowShopForm((prev) => !prev)}>
                {showShopForm ? t('dashboard.shops.toggleClose') : t('dashboard.shops.toggleOpen')}
              </button>
            </div>

            {shops.length === 0 ? (
              <div className="shop-empty">
                {t('dashboard.shops.empty')}
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
                        <span className="shop-meta">{t('dashboard.shops.meta.shopId')} · {shop.shop_id}</span>
                        <span className="shop-meta">{t('dashboard.shops.meta.businessNumber')} · {shop.business_registration_number}</span>
                        <span className="shop-meta">{t('dashboard.shops.meta.phone')} · {shop.contact_phone}</span>
                        <span className="shop-meta">{t('dashboard.shops.meta.usage')} · {formatUsage(shop)}</span>
                      </div>
                      <div className="inline-actions inline-actions--spread">
                        <button
                          className="material-btn-outlined"
                          onClick={() => loadUsageHistory(shop)}
                          disabled={usageLoading[shop.shop_id]}
                        >
                          {usageLoading[shop.shop_id] ? t('dashboard.shops.usage.buttonLoading') : t('dashboard.shops.usage.buttonLoad')}
                        </button>
                        <form className="quota-form" onSubmit={(e) => handleAdjustSubmit(shop, e)}>
                          <input
                            type="number"
                            className="material-input"
                            placeholder={t('dashboard.shops.quotaForm.amountPlaceholder')}
                            value={formState.amount}
                            onChange={(e) => handleAdjustChange(shop.shop_id, 'amount', e.target.value)}
                          />
                          <input
                            type="text"
                            className="material-input"
                            placeholder={t('dashboard.shops.quotaForm.notePlaceholder')}
                            value={formState.note || ''}
                            onChange={(e) => handleAdjustChange(shop.shop_id, 'note', e.target.value)}
                          />
                          <button className="material-btn" type="submit" disabled={formState.submitting}>
                            {formState.submitting ? t('dashboard.shops.quotaForm.submitting') : t('dashboard.shops.quotaForm.submit')}
                          </button>
                        </form>
                      </div>
                      {formState.error && <div className="material-error">{formState.error}</div>}
                      {usageState?.entries && (
                        <div className="usage-history">
                          <h4>{t('dashboard.shops.usage.recent')}</h4>
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
                  <label className="material-label" htmlFor="shopId">{t('dashboard.shopForm.labels.shopId')}</label>
                  <input
                    id="shopId"
                    type="text"
                    className="material-input"
                    placeholder={t('dashboard.shopForm.placeholders.shopId')}
                    value={shopId}
                    onChange={(e) => setShopId(e.target.value)}
                    required
                  />
                </div>
                <div>
                  <label className="material-label" htmlFor="shopName">{t('dashboard.shopForm.labels.shopName')}</label>
                  <input
                    id="shopName"
                    type="text"
                    className="material-input"
                    placeholder={t('dashboard.shopForm.placeholders.shopName')}
                    value={shopName}
                    onChange={(e) => setShopName(e.target.value)}
                    required
                  />
                </div>
                <div>
                  <label className="material-label" htmlFor="companyName">{t('dashboard.shopForm.labels.companyName')}</label>
                  <input
                    id="companyName"
                    type="text"
                    className="material-input"
                    placeholder={t('dashboard.shopForm.placeholders.companyName')}
                    value={companyName}
                    onChange={(e) => setCompanyName(e.target.value)}
                    required
                  />
                </div>
                <div>
                  <label className="material-label" htmlFor="businessNumber">{t('dashboard.shopForm.labels.businessNumber')}</label>
                  <input
                    id="businessNumber"
                    type="text"
                    className="material-input"
                    placeholder={t('dashboard.shopForm.placeholders.businessNumber')}
                    value={businessNumber}
                    onChange={(e) => setBusinessNumber(e.target.value)}
                    required
                  />
                </div>
                <div>
                  <label className="material-label" htmlFor="contactPhone">{t('dashboard.shopForm.labels.contactPhone')}</label>
                  <input
                    id="contactPhone"
                    type="tel"
                    className="material-input"
                    placeholder={t('dashboard.shopForm.placeholders.contactPhone')}
                    value={contactPhone}
                    onChange={(e) => setContactPhone(e.target.value)}
                    required
                  />
                </div>
                <button className="material-btn" type="submit" disabled={shopLoading}>
                  {shopLoading ? t('dashboard.shopForm.submitting') : t('dashboard.shopForm.submit')}
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