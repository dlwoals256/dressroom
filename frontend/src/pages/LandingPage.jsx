import React from 'react'
import { Link } from 'react-router-dom'
import PageLayout from '../components/PageLayout.jsx'

const features = [
  {
    icon: '⚡',
    title: '10초 이내 생성',
    description: '고객이 버튼을 누르면 AI가 즉시 시착 이미지를 생성해 쇼핑 경험을 끊김 없이 이어줍니다.'
  },
  {
    icon: '🔗',
    title: '임베드 통합',
    description: '기존 쇼핑몰 페이지에 한 줄 스크립트로 삽입해 제품 상세 보기와 자연스럽게 연결됩니다.'
  },
  {
    icon: '🛍️',
    title: '제품 이미지 연동',
    description: '상품 API와 손쉽게 연동할 수 있도록 설계되어 더미 이미지를 실제 상품 데이터로 간단히 교체할 수 있습니다.'
  },
  {
    icon: '🔐',
    title: '보안 & 토큰 기반 접근',
    description: 'JWT 기반 인증으로 상점 데이터와 Generate 엔드포인트 접근을 안전하게 제어합니다.'
  }
]

const LandingPage = () => {
  return (
    <PageLayout>
      <div className="landing-container">
        <section className="hero">
          <div className="hero__content">
            <span className="hero__badge">AI Virtual Fitting Platform</span>
            <h1 className="hero__title">쇼핑몰 고객을 위한 몰입형 시착 경험을 단 10초 만에</h1>
            <p className="hero__subtitle">
              Dressroom은 제품 이미지와 고객의 전신 사진을 결합해 실시간으로 시착 이미지를 만들어 주는 B2B 임베디드 서비스입니다. 간결한 워크플로우와 안정적인 API로 빠르게 도입하세요.
            </p>
            <div className="hero__cta">
              <Link to="/register" className="cta-primary">무료로 시작하기</Link>
              <Link to="/login" className="cta-secondary">이미 계정이 있다면 로그인</Link>
            </div>
          </div>
          <div className="hero__visual">
            <div className="hero__visual-grid">
              <div className="hero__visual-card">
                <strong>온보딩</strong>
                <p>회원가입 후 상점을 등록하면 즉시 Demo Generate 엔드포인트를 체험할 수 있습니다.</p>
              </div>
              <div className="hero__visual-card">
                <strong>토큰 기반 보안</strong>
                <p>로그인 후 발급받은 Access 토큰으로 상점 생성과 이미지 생성을 안전하게 요청합니다.</p>
              </div>
              <div className="hero__visual-card">
                <strong>반응형 레이아웃</strong>
                <p>데스크톱에서는 좌우 2열, 모바일에서는 상하 배치로 자연스러운 사용자 경험을 제공합니다.</p>
              </div>
              <div className="hero__visual-card">
                <strong>그라데이션 테마</strong>
                <p>Google Material 원칙을 따르는 다크 테마로 이미지를 더욱 돋보이게 합니다.</p>
              </div>
            </div>
          </div>
        </section>

        <section className="feature-section">
          <h2 className="section-title">Dressroom으로 완성하는 AI 시착 여정</h2>
          <div className="feature-grid">
            {features.map((feature) => (
              <article key={feature.title} className="feature-card">
                <div className="feature-card__icon">{feature.icon}</div>
                <h3>{feature.title}</h3>
                <p>{feature.description}</p>
              </article>
            ))}
          </div>
        </section>
      </div>
    </PageLayout>
  )
}

export default LandingPage
