import React, { useEffect, useRef, useState } from 'react'
import { useParams } from 'react-router-dom'
import PageLayout from '../components/PageLayout.jsx'
import { API_BASE } from '../config.js'

const ShopDetail = () => {
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

  const productImageUrl = '/dev/example_product.jpg'
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
      if (!res.ok) throw new Error('상점 정보를 불러올 수 없습니다.')
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
      setError('로그인이 필요합니다.')
      setLoading(false)
      return
    }
    fetchShopDetail(true)
  }, [access, shopId])

  const fetchUsageHistory = async () => {
    if (!access) return
    setUsageLoading(true)
    setUsageError('')
    try {
      const res = await fetch(`${API_BASE}/shops/${encodeURIComponent(shopId)}/usage/?limit=6`, {
        headers: authHeaders,
      })
      if (!res.ok) throw new Error('사용량 기록을 불러오지 못했습니다.')
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
      setGenError('전신 사진을 업로드해 주세요.')
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
      formData.append('person_image', personImage)

      const res = await fetch(`${API_BASE}/generate/`, {
        method: 'POST',
        headers: authHeaders,
        body: formData,
      })

      if (!res.ok) {
        let message = '이미지 생성에 실패했습니다.'
        try {
          const err = await res.json()
          message = err.error || Object.values(err)[0] || message
        } catch (parseErr) {
          console.error(parseErr)
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

  if (loading) {
    return (
      <PageLayout>
        <div className="fullscreen-state">
          <div className="state-card">
            <div className="material-spinner" />
            <p className="state-card__message">상점 정보를 불러오는 중입니다…</p>
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
            <p className="state-card__title">요청을 완료할 수 없어요</p>
            <p className="state-card__message">{error}</p>
          </div>
        </div>
      </PageLayout>
    )
  }

  const usageSummary = shop?.current_month_usage

  return (
    <PageLayout>
      <div className="shop-detail-shell">
        <div className="shop-detail-card">
          <div className="shop-header">
            <h2>{shop?.shop_name}</h2>
            <div className="shop-header__meta">
              <span>상점 ID · {shop?.shop_id}</span>
              <span>업체명 · {shop?.company_name}</span>
              <span>사업자등록번호 · {shop?.business_registration_number}</span>
              <span>연락처 · {shop?.contact_phone}</span>
              <span>고객 식별자 · {customerId}</span>
              {typeof shop?.count === 'number' && (
                <span>남은 크레딧 · {shop.count}</span>
              )}
              {usageSummary && (
                <span>
                  이번 달 사용량 {usageSummary.used_requests}/{usageSummary.quota_snapshot}
                </span>
              )}
            </div>
          </div>

          <section>
            <h3 className="section-heading">Generate 데모</h3>
            <p className="auth-subtext">제품 이미지와 고객 이미지를 업로드해 AI 기반 시착 결과를 만들어 보세요.</p>

            <div className="demo-grid">
              <div className="demo-panel">
                <p className="demo-panel__title">제품 이미지</p>
                <img src={productImageUrl} alt="제품 이미지" className="material-img" />
                <span className="shop-meta">쇼핑몰 연동 시 이 이미지를 API 결과로 교체할 수 있습니다.</span>
              </div>

              <div className="demo-panel">
                <p className="demo-panel__title">내 사진 업로드</p>
                <input
                  type="file"
                  ref={fileInputRef}
                  accept="image/*"
                  className="hidden-file-input"
                  onChange={handlePersonChange}
                />
                {!personPreview ? (
                  <button type="button" className="upload-trigger" onClick={() => fileInputRef.current?.click()}>
                    전신 사진 선택하기
                  </button>
                ) : (
                  <img src={personPreview} alt="업로드 미리보기" className="material-img" />
                )}
                {personPreview && (
                  <button type="button" className="upload-reset" onClick={clearPersonImage}>
                    다른 사진 선택
                  </button>
                )}
              </div>
            </div>

            <button
              type="button"
              className="generate-btn"
              onClick={handleGenerate}
              disabled={genLoading || !personImage}
            >
              {genLoading ? '이미지를 생성하는 중… (약 10초)' : 'AI 시착 이미지 생성'}
            </button>

            {genError && <div className="inline-feedback">{genError}</div>}

            {genLoading && (
              <div className="demo-status">
                <div className="material-spinner" />
                <span>AI가 이미지를 생성하고 있어요. 잠시만 기다려 주세요.</span>
              </div>
            )}

            {resultUrl && (
              <div className="demo-result">
                <p className="demo-panel__title">생성된 시착 이미지</p>
                <img src={resultUrl} alt="생성된 시착 결과" />
              </div>
            )}
          </section>

          <section className="usage-history">
            <h3 className="section-heading">최근 사용량</h3>
            {usageLoading && (
              <div className="demo-status">
                <div className="material-spinner" />
                <span>사용량을 불러오는 중입니다…</span>
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
              <p className="auth-subtext">아직 집계된 사용량이 없습니다.</p>
            )}
          </section>
        </div>
      </div>
    </PageLayout>
  )
}

export default ShopDetail
