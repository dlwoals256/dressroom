import React from 'react'
import PageLayout from '../components/PageLayout.jsx'
import { API_BASE } from '../config.js'
import { useTranslation } from 'react-i18next'

const GenerateDemo = () => {
  const { t } = useTranslation()

  const steps = t('generateDemo.steps', { returnObjects: true, defaultValue: [] })
  const tips = t('generateDemo.tipSection.items', { returnObjects: true, defaultValue: [] })

  const demoSnippet = [
    "const formData = new FormData();",
    "formData.append('shop_id', shopId);",
    "formData.append('customer_id', customerEmail);",
    "formData.append('product_image', productBlob, 'product.png');",
    "formData.append('person_image', fileInput.files[0]);",
    '',
    `const response = await fetch('${API_BASE}/generate/', {`,
    "  method: 'POST',",
    "  headers: { Authorization: `Bearer ${accessToken}` },",
    '  body: formData,',
    '});',
    '',
    'if (!response.ok) {',
    '  const err = await response.json();',
    `  throw new Error(err.error || '${t('generateDemo.codeSnippet.errorFallback')}');`,
    '}',
    '',
    'const blob = await response.blob();',
    'const previewUrl = URL.createObjectURL(blob);',
  ].join('\n')

  return (
    <PageLayout>
      <div className="dashboard-shell">
        <div className="dashboard-card">
          <div>
            <h2>{t('generateDemo.header.title')}</h2>
            <p className="auth-subtext">{t('generateDemo.header.subtitle')}</p>
          </div>

          <div className="feature-grid">
            {Array.isArray(steps) && steps.map((step) => (
              <article key={step.title} className="feature-card">
                <div className="feature-card__icon">✓</div>
                <h3>{step.title}</h3>
                <p>{step.detail}</p>
              </article>
            ))}
          </div>

          <section className="material-section">
            <h3 className="section-heading">{t('generateDemo.codeSection.title')}</h3>
            <p className="auth-subtext">{t('generateDemo.codeSection.subtitle')}</p>
            <pre className="code-block">
              <code>{demoSnippet}</code>
            </pre>
          </section>

          <section className="material-section">
            <h3 className="section-heading">{t('generateDemo.tipSection.title')}</h3>
            <ul className="material-list">
              {Array.isArray(tips) && tips.map((item, idx) => (
                <li key={idx}>{item}</li>
              ))}
            </ul>
          </section>
        </div>
      </div>
    </PageLayout>
  )
}

export default GenerateDemo