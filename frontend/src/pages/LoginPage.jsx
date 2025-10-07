import React, { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import PageLayout from '../components/PageLayout.jsx'
import { API_BASE } from '../config.js'
import { useTranslation } from 'react-i18next'

const LoginPage = () => {
  const { t } = useTranslation()
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
        const err = await res.json().catch(() => ({}))
        throw new Error(err.detail || t('login.errors.generic'))
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
            <h2 className="auth-heading">{t('login.title')}</h2>
            <p className="auth-subtext">{t('login.subtitle')}</p>
          </div>

          <form className="auth-form" onSubmit={handleSubmit}>
            <label className="material-label" htmlFor="email">{t('login.labels.email')}</label>
            <input
              id="email"
              type="email"
              className="material-input"
              placeholder={t('login.placeholders.email')}
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
            />

            <label className="material-label" htmlFor="password">{t('login.labels.password')}</label>
            <input
              id="password"
              type="password"
              className="material-input"
              placeholder={t('login.placeholders.password')}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
            />

            <button className="material-btn" type="submit" disabled={loading}>
              {loading ? t('login.submit.loading') : t('login.submit.default')}
            </button>
          </form>

          {error && <div className="material-error">{error}</div>}

          <div className="auth-footer">
            {t('login.footer.prompt')}{' '}
            <Link to="/register">{t('login.footer.register')}</Link>
          </div>
        </div>
      </div>
    </PageLayout>
  )
}

export default LoginPage