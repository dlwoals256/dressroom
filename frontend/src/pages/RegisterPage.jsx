import React, { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import PageLayout from '../components/PageLayout.jsx'
import TermsModal from '../components/TermsModal.jsx'
import { API_BASE } from '../config.js'

const RegisterPage = () => {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [fullName, setFullName] = useState('')
  const [phone, setPhone] = useState('')
  const [acceptTerms, setAcceptTerms] = useState(false)
  const [showTerms, setShowTerms] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const navigate = useNavigate()

  const handleSubmit = async (e) => {
    e.preventDefault()
    setError('')

    if (!acceptTerms) {
      setError('서비스 이용 약관에 동의해 주세요.')
      return
    }

    setLoading(true)
    try {
      const payload = {
        email,
        password,
        full_name: fullName,
        accept_terms: true,
      }
      if (phone.trim()) {
        payload.phone = phone.trim()
      }

      const res = await fetch(`${API_BASE}/register/`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      })

      if (!res.ok) {
        const err = await res.json()
        if (err.error && (err.error.includes('이미 가입') || err.error.includes('exists'))) {
          alert('이미 가입된 이메일입니다. 로그인 해주세요.')
          navigate('/login')
          return
        }
        const firstError = typeof err === 'object' ? Object.values(err)[0] : null
        throw new Error(firstError || err.error || '회원가입에 실패했습니다.')
      }

      alert('회원가입이 완료됐어요. 이제 로그인해 주세요!')
      navigate('/login')
    } catch (err) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  return (
    <PageLayout>
      <div className="auth-page">
        <div className="auth-panel">
          <div>
            <h2 className="auth-heading">회원가입</h2>
            <p className="auth-subtext">계정을 만들고 내 쇼핑몰에 Dressroom 데모를 연동해 보세요.</p>
          </div>

          <form className="auth-form" onSubmit={handleSubmit}>
            <label className="material-label" htmlFor="email">이메일</label>
            <input
              id="email"
              type="email"
              className="material-input"
              placeholder="name@domain.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
            />

            <label className="material-label" htmlFor="fullName">대표자 이름</label>
            <input
              id="fullName"
              type="text"
              className="material-input"
              placeholder="홍길동"
              value={fullName}
              onChange={(e) => setFullName(e.target.value)}
              required
            />

            <label className="material-label" htmlFor="password">비밀번호</label>
            <input
              id="password"
              type="password"
              className="material-input"
              placeholder="8자 이상의 안전한 비밀번호"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
            />

            <label className="material-label" htmlFor="phone">연락처 (선택)</label>
            <input
              id="phone"
              type="tel"
              className="material-input"
              placeholder="010-1234-5678"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
            />

            <div className="terms-consent">
              <label className="material-label" htmlFor="acceptTerms">
                <input
                  id="acceptTerms"
                  type="checkbox"
                  checked={acceptTerms}
                  onChange={(e) => setAcceptTerms(e.target.checked)}
                />
                <span>서비스 이용 약관에 동의합니다.</span>
              </label>
              <button
                className="link-btn"
                type="button"
                onClick={() => setShowTerms(true)}
              >
                약관 보기
              </button>
            </div>

            <button className="material-btn" type="submit" disabled={loading}>
              {loading ? '가입 중…' : 'Dressroom 시작하기'}
            </button>
          </form>

          {error && <div className="material-error">{error}</div>}

          <div className="auth-footer">
            이미 계정이 있으신가요?{' '}
            <Link to="/login">로그인</Link>
          </div>
        </div>
      </div>
      <TermsModal
        open={showTerms}
        onClose={() => setShowTerms(false)}
        onAccept={() => {
          setAcceptTerms(true)
          setShowTerms(false)
        }}
      />
    </PageLayout>
  )
}

export default RegisterPage
