import React, { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import PageLayout from '../components/PageLayout.jsx'
import TermsModal from '../components/TermsModal.jsx'
import { API_BASE } from '../config.js'
import { useTranslation } from 'react-i18next'

const RegisterPage = () => {
  const { t } = useTranslation()

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
      setError(t('register.errors.acceptTerms'))
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
          alert(t('register.alerts.duplicate'))
          navigate('/login')
          return
        }
        const firstError = typeof err === 'object' ? Object.values(err)[0] : null
        throw new Error(firstError || err.error || t('register.errors.generic'))
      }

      alert(t('register.alerts.success'))
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
            <h2 className="auth-heading">{t('register.title')}</h2>
            <p className="auth-subtext">{t('register.subtitle')}</p>
          </div>

          <form className="auth-form" onSubmit={handleSubmit}>
            <label className="material-label" htmlFor="email">{t('register.labels.email')}</label>
            <input
              id="email"
              type="email"
              className="material-input"
              placeholder={t('register.placeholders.email')}
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
            />

            <label className="material-label" htmlFor="fullName">{t('register.labels.fullName')}</label>
            <input
              id="fullName"
              type="text"
              className="material-input"
              placeholder={t('register.placeholders.fullName')}
              value={fullName}
              onChange={(e) => setFullName(e.target.value)}
              required
            />

            <label className="material-label" htmlFor="password">{t('register.labels.password')}</label>
            <input
              id="password"
              type="password"
              className="material-input"
              placeholder={t('register.placeholders.password')}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
            />

            <label className="material-label" htmlFor="phone">{t('register.labels.phone')}</label>
            <input
              id="phone"
              type="tel"
              className="material-input"
              placeholder={t('register.placeholders.phone')}
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
                <span>{t('register.terms.label')}</span>
              </label>
              <button
                className="link-btn"
                type="button"
                onClick={() => setShowTerms(true)}
              >
                {t('register.terms.view')}
              </button>
            </div>

            <button className="material-btn" type="submit" disabled={loading}>
              {loading ? t('register.submit.loading') : t('register.submit.default')}
            </button>
          </form>

          {error && <div className="material-error">{error}</div>}

          <div className="auth-footer">
            {t('register.footer.prompt')}{' '}
            <Link to="/login">{t('register.footer.login')}</Link>
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