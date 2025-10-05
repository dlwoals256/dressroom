import { Link } from 'react-router-dom'

const PageLayout = ({ children }) => {
  const isAuthed = typeof window !== 'undefined' && !!localStorage.getItem('access')

  return (
    <div className="app-root">
      <header className="global-header">
        <div className="global-header__brand">
          <p className="global-header__title">Dressroom</p>
          <p className="global-header__tagline">AI Virtual Fitting for Modern Commerce</p>
        </div>
        <nav className="global-nav">
          <Link to="/" className="nav-link">서비스 소개</Link>
          <Link to="/dashboard" className="nav-link">대시보드</Link>
          {isAuthed ? (
            <Link to="/dashboard" className="nav-link">내 상점</Link>
          ) : (
            <>
              <Link to="/login" className="nav-link">로그인</Link>
              <Link to="/register" className="nav-link">회원가입</Link>
            </>
          )}
        </nav>
      </header>
      <main>{children}</main>
      <footer className="global-footer">
        © {new Date().getFullYear()} Dressroom. Crafted for immersive retail experiences.
      </footer>
    </div>
  )
}

export default PageLayout
