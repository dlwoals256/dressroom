import React, { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import PageLayout from '../components/PageLayout.jsx'
import { API_BASE } from '../config.js'

const LoginPage = () => {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const navigate = useNavigate()

  const handleSubmit = async (e) => {
    e.preventDefault()
    setError('')
    setLoading(true)
    try {
      const res = await fetch(`${API_BASE}/login/`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password })
      })

      if (!res.ok) {
        const err = await res.json()
        throw new Error(err.detail || '로그인에 실패했습니다.')
      }

      const tokens = await res.json()
      localStorage.setItem('access', tokens.access)
      localStorage.setItem('refresh', tokens.refresh)
      localStorage.setItem('userEmail', email)

      navigate('/dashboard')
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
            <h2 className="auth-heading">로그인</h2>
            <p className="auth-subtext">발급받은 토큰으로 상점 정보를 관리하고 Generate 데모를 실행하세요.</p>
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

            <label className="material-label" htmlFor="password">비밀번호</label>
            <input
              id="password"
              type="password"
              className="material-input"
              placeholder="비밀번호를 입력하세요"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
            />

            <button className="material-btn" type="submit" disabled={loading}>
              {loading ? '로그인 중…' : '대시보드로 이동'}
            </button>
          </form>

          {error && <div className="material-error">{error}</div>}

          <div className="auth-footer">
            아직 회원이 아니신가요?{' '}
            <Link to="/register">지금 가입하기</Link>
          </div>
        </div>
      </div>
    </PageLayout>
  )
}

export default LoginPage
