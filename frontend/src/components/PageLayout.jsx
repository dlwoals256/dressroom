import React from 'react'
import { Link } from 'react-router-dom'
import { useTranslation } from 'react-i18next'

const PageLayout = ({ children }) => {
  const isAuthed = typeof window !== 'undefined' && !!localStorage.getItem('access')
  const { t, i18n } = useTranslation()

  // 지원 언어를 i18n 리소스에서 자동으로 가져옴 (ko/en + jp 또는 ja)
  const supported = Object.keys(i18n.options?.resources || {})
  const langOptions = [
    { code: 'ko', label: '한국어' },
    { code: 'en', label: 'English' },
    supported.includes('jp')
      ? { code: 'jp', label: '日本語' }
      : supported.includes('ja')
      ? { code: 'ja', label: '日本語' }
      : null,
  ].filter(Boolean)

  const current = (i18n.language || 'ko').split('-')[0]
  const selected = langOptions.some(o => o.code === current)
    ? current
    : (langOptions[0]?.code || 'ko')

  const onChangeLang = (e) => {
    const next = e.target.value
    i18n.changeLanguage(next)
    // 언어 감지 플러그인을 안 쓰는 경우를 대비해 저장
    try { localStorage.setItem('i18nextLng', next) } catch (_) {}
  }

  return (
    <div className="app-root">
      <header className="global-header">
        <Link to="/" className="global-header__brand-link" aria-label={t('layout.brand.aria', '홈으로')}>
          <img
            src="/assets/icon.png"
            alt={t('layout.brand.logoAlt', 'Dressroom 로고')}
            className="global-header__logo"
          />
          <div className="global-header__brand-text">
            <p className="global-header__title">Dressroom</p>
            <p className="global-header__tagline">
              {t('layout.brand.tagline', 'AI Virtual Fitting for Modern Commerce')}
            </p>
          </div>
        </Link>

        <nav className="global-nav" aria-label={t('layout.nav.aria', '주요 메뉴')}>
          <Link to="/" className="nav-link">{t('layout.nav.about', '서비스 소개')}</Link>
          <Link to="/dashboard" className="nav-link">{t('layout.nav.dashboard', '대시보드')}</Link>
          {isAuthed ? (
            <Link to="/dashboard" className="nav-link">{t('layout.nav.myStore', '내 상점')}</Link>
          ) : (
            <>
              <Link to="/login" className="nav-link">{t('layout.nav.login', '로그인')}</Link>
              <Link to="/register" className="nav-link">{t('layout.nav.register', '회원가입')}</Link>
            </>
          )}

          {/* 구분선 (디자인에 따라 제거 가능) */}
          <span className="nav-divider" aria-hidden />

          {/* 언어 전환 드롭다운 */}
          <label className="lang-switcher">
            <span className="sr-only">{t('layout.nav.language', '언어 선택')}</span>
            <select
              className="lang-select"
              value={selected}
              onChange={onChangeLang}
              aria-label={t('layout.nav.language', '언어 선택')}
            >
              {langOptions.map(({ code, label }) => (
                <option key={code} value={code}>{label}</option>
              ))}
            </select>
          </label>
        </nav>
      </header>

      <main>{children}</main>

      <footer className="global-footer">
        © {new Date().getFullYear()} Dressroom. {t('layout.footer', 'Crafted for immersive retail experiences.')}
      </footer>
    </div>
  )
}

export default PageLayout