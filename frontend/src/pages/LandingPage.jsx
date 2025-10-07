import React from 'react'
import { Link } from 'react-router-dom'
import PageLayout from '../components/PageLayout.jsx'
import { useTranslation } from 'react-i18next'


const LandingPage = () => {
  const { t } = useTranslation()


  const featureItems = t('features.items', { returnObjects: true })
  const visualCards = t('hero.visual.cards', { returnObjects: true })


  return (
    <PageLayout>
      <div className="landing-container">
        <section className="hero">
          <div className="hero__content">
            <span className="hero__badge">{t('hero.badge')}</span>
            <h1 className="hero__title">{t('hero.title')}</h1>
            <p className="hero__subtitle">{t('hero.subtitle')}</p>
            <div className="hero__cta">
              <Link to="/register" className="cta-primary">{t('hero.ctaStart')}</Link>
              <Link to="/login" className="cta-secondary">{t('hero.ctaLogin')}</Link>
            </div>
          </div>
          <div className="hero__visual">
            <div className="hero__visual-grid">
              {visualCards.map(card => (
                <div className="hero__visual-card" key={card.title}>
                  <strong>{card.title}</strong>
                  <p>{card.body}</p>
                </div>
              ))}
            </div>
          </div>
        </section>


        <section className="feature-section">
          <h2 className="section-title">{t('features.sectionTitle')}</h2>
          <div className="feature-grid">
            {featureItems.map((feature) => (
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