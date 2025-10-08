import React, { useEffect, useRef, useState } from 'react'
import { useParams } from 'react-router-dom'
import PageLayout from '../components/PageLayout.jsx'
import { API_BASE } from '../config.js'
import { useTranslation } from 'react-i18next'

const ShopDetail = () => {
  const { t } = useTranslation()
  const { shopId } = useParams()
  const [shop, setShop] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [personImage, setPersonImage] = useState(null)
  const [personPreview, setPersonPreview] = useState('')
  const [genLoading, setGenLoading] = useState(false)
  const [genError, setGenError] = useState('')
  const [resultUrl, setResultUrl] = useState('')
  const [usageHistory, setUsageHistory] = useState([])
  const [usageLoading, setUsageLoading] = useState(false)
  const [usageError, setUsageError] = useState('')
  const objectUrlRef = useRef('')
  const fileInputRef = useRef(null)

  const productImageUrl = '/dev/jacket.png'
  const access = localStorage.getItem('access')
  const customerId = localStorage.getItem('userEmail') || 'demo-customer'

  const authHeaders = access ? { Authorization: `Bearer ${access}` } : {}

  useEffect(() => {
    return () => {
      if (objectUrlRef.current) {
        URL.revokeObjectURL(objectUrlRef.current)
      }
    }
  }, [])

  const fetchShopDetail = async (showSpinner = true) => {
    if (showSpinner) {
      setLoading(true)
      setError('')
    }
    try {
      const res = await fetch(`${API_BASE}/shops/${encodeURIComponent(shopId)}/`, {
        headers: authHeaders,
      })
      if (!res.ok) throw new Error(t('shopDetail.errors.fetchShop'))
      const data = await res.json()
      setShop(data)
    } catch (err) {
      setError(err.message)
    } finally {
      if (showSpinner) {
        setLoading(false)
      }
    }
  }

  useEffect(() => {
    if (!access) {
      setError(t('shopDetail.errors.loginRequired'))
      setLoading(false)
      return
    }
    fetchShopDetail(true)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [access, shopId])

  const fetchUsageHistory = async () => {
    if (!access) return
    setUsageLoading(true)
    setUsageError('')
    try {
      const res = await fetch(`${API_BASE}/shops/${encodeURIComponent(shopId)}/usage/?limit=6`, {
        headers: authHeaders,
      })
      if (!res.ok) throw new Error(t('shopDetail.errors.loadUsage'))
      const data = await res.json()
      setUsageHistory(data)
    } catch (err) {
      setUsageError(err.message)
    } finally {
      setUsageLoading(false)
    }
  }

  useEffect(() => {
    if (shop) {
      fetchUsageHistory()
    }
  }, [shop, shopId, access])

  const handlePersonChange = (e) => {
    const file = e.target.files?.[0]
    if (file) {
      setPersonImage(file)
      setPersonPreview(URL.createObjectURL(file))
      if (objectUrlRef.current) {
        URL.revokeObjectURL(objectUrlRef.current)
        objectUrlRef.current = ''
      }
      setResultUrl('')
    }
  }

  const clearPersonImage = () => {
    setPersonImage(null)
    setPersonPreview('')
    if (fileInputRef.current) {
      fileInputRef.current.value = ''
    }
  }

  const handleGenerate = async () => {
    if (!personImage) {
      setGenError(t('shopDetail.generate.errors.noPersonImage'))
      return
    }
    if (!shop) return

    setGenLoading(true)
    setGenError('')
    if (objectUrlRef.current) {
      URL.revokeObjectURL(objectUrlRef.current)
      objectUrlRef.current = ''
    }
    setResultUrl('')

    try {
      const prodRes = await fetch(productImageUrl)
      const productBlob = await prodRes.blob()

      const formData = new FormData()
      formData.append('shop_id', shop.shop_id)
      formData.append('customer_id', customerId)
      formData.append('product_image', productBlob, 'product.png')
      const extension = personImage.name.split('.').pop()?.toLowerCase() || 'jpg'
      formData.append('person_image', personImage, `person.${extension}`)

      const res = await fetch(`${API_BASE}/generate/`, {
        method: 'POST',
        headers: authHeaders,
        body: formData,
      })

      if (!res.ok) {
        let message = t('shopDetail.generate.errors.fail')
        try {
          const err = await res.json()
          message = err.error || Object.values(err)[0] || message
        } catch (parseErr) {
          // ignore
        }
        throw new Error(message)
      }

      const blob = await res.blob()
      const url = URL.createObjectURL(blob)
      objectUrlRef.current = url
      setResultUrl(url)
      setGenLoading(false)

      await fetchShopDetail(false)
      await fetchUsageHistory()
    } catch (err) {
      setGenError(err.message)
      setGenLoading(false)
    }
  }

  const usageSummary = shop?.current_month_usage

  if (loading) {
    return (
      <PageLayout>
        <div className="fullscreen-state">
          <div className="state-card">
            <div className="material-spinner" />
            <p className="state-card__message">{t('shopDetail.loading')}</p>
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
            <p className="state-card__title">{t('shopDetail.errorView.title')}</p>
            <p className="state-card__message">{error}</p>
          </div>
        </div>
      </PageLayout>
    )
  }

  return (
    <PageLayout>
      <div className="shop-detail-shell">
        <div className="shop-detail-card">
          <div className="shop-header">
            <h2>{shop?.shop_name}</h2>
            <div className="shop-header__meta">
              <span>{t('shopDetail.meta.shopId')} · {shop?.shop_id}</span>
              <span>{t('shopDetail.meta.companyName')} · {shop?.company_name}</span>
              <span>{t('shopDetail.meta.businessNumber')} · {shop?.business_registration_number}</span>
              <span>{t('shopDetail.meta.phone')} · {shop?.contact_phone}</span>
              <span>{t('shopDetail.meta.customerId')} · {customerId}</span>
              {typeof shop?.count === 'number' && (
                <span>{t('shopDetail.meta.remainingCredits')} · {shop.count}</span>
              )}
              {usageSummary && (
                <span>
                  {t('shopDetail.meta.monthUsage', { used: usageSummary.used_requests, quota: usageSummary.quota_snapshot })}
                </span>
              )}
            </div>
          </div>

          <section>
            <h3 className="section-heading">{t('shopDetail.generate.heading')}</h3>
            <p className="auth-subtext">{t('shopDetail.generate.subtitle')}</p>

            <div className="demo-grid">
              <div className="demo-panel">
                <p className="demo-panel__title">{t('shopDetail.generate.product.title')}</p>
                <img src={productImageUrl} alt={t('shopDetail.generate.product.alt')} className="material-img" />
                <span className="shop-meta">{t('shopDetail.generate.product.note')}</span>
              </div>

              <div className="demo-panel">
                <p className="demo-panel__title">{t('shopDetail.generate.person.title')}</p>
                <input
                  type="file"
                  ref={fileInputRef}
                  accept="image/*"
                  className="hidden-file-input"
                  onChange={handlePersonChange}
                />
                {!personPreview ? (
                  <button type="button" className="upload-trigger" onClick={() => fileInputRef.current?.click()}>
                    {t('shopDetail.generate.person.select')}
                  </button>
                ) : (
                  <img src={personPreview} alt={t('shopDetail.generate.person.previewAlt')} className="material-img" />
                )}
                {personPreview && (
                  <button type="button" className="upload-reset" onClick={clearPersonImage}>
                    {t('shopDetail.generate.person.reset')}
                  </button>
                )}
              </div>
            </div>

            <p className="auth-subtext" style={{ marginTop: 12, textAlign: 'center' }}>
              {t('shopDetail.generate.tips')}
            </p>

            <button
              type="button"
              className="generate-btn"
              onClick={handleGenerate}
              disabled={genLoading || !personImage}
            >
              {genLoading ? t('shopDetail.generate.cta.loading') : t('shopDetail.generate.cta.default')}
            </button>

            {genError && <div className="inline-feedback">{genError}</div>}

            {genLoading && (
              <div className="demo-status">
                <div className="material-spinner" />
                <span>{t('shopDetail.generate.status')}</span>
              </div>
            )}

            {resultUrl && (
              <div className="demo-result">
                <p className="demo-panel__title">{t('shopDetail.generate.result.title')}</p>
                <img src={resultUrl} alt={t('shopDetail.generate.result.alt')} />
              </div>
            )}
          </section>

          <section className="usage-history">
            <h3 className="section-heading">{t('shopDetail.usage.heading')}</h3>
            {usageLoading && (
              <div className="demo-status">
                <div className="material-spinner" />
                <span>{t('shopDetail.usage.loading')}</span>
              </div>
            )}
            {usageError && <div className="material-error">{usageError}</div>}
            {!usageLoading && !usageError && usageHistory.length > 0 && (
              <ul>
                {usageHistory.map((entry) => (
                  <li key={entry.id || entry.period_start}>
                    <span>{entry.period_start}</span>
                    <span>{entry.used_requests} / {entry.quota_snapshot}</span>
                  </li>
                ))}
              </ul>
            )}
            {!usageLoading && !usageError && usageHistory.length === 0 && (
              <p className="auth-subtext">{t('shopDetail.usage.empty')}</p>
            )}
          </section>
        </div>
      </div>
    </PageLayout>
  )
}

export default ShopDetail