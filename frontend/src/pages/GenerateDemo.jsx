import React from 'react'
import PageLayout from '../components/PageLayout.jsx'
import { API_BASE } from '../config.js'

const steps = [
  {
    title: '1. Access 토큰 발급',
    detail: '로그인 엔드포인트(/api/login/)로 이메일과 비밀번호를 전송하면 access, refresh 토큰이 반환됩니다.'
  },
  {
    title: '2. 상점 등록',
    detail: '발급 받은 access 토큰을 Authorization 헤더에 담아 /api/shops/ 로 shop_id, shop_name, company_name, business_registration_number, contact_phone을 전송합니다.'
  },
  {
    title: '3. Generate 호출',
    detail: 'shop_id, customer_id, person_image, product_image를 FormData로 묶어 /api/generate/로 전송하면 PNG 바이너리 응답을 바로 받을 수 있습니다.'
  }
]

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
  "  throw new Error(err.error || '생성 실패');",
  '}',
  '',
  'const blob = await response.blob();',
  'const previewUrl = URL.createObjectURL(blob);',
].join('\n')

const GenerateDemo = () => {
  return (
    <PageLayout>
      <div className="dashboard-shell">
        <div className="dashboard-card">
          <div>
            <h2>Generate API 데모 가이드</h2>
            <p className="auth-subtext">상점 상세 페이지에서 바로 데모를 실행할 수 있고, 아래 단계를 따라 임베드 환경에서도 쉽게 구현할 수 있습니다.</p>
          </div>

          <div className="feature-grid">
            {steps.map((step) => (
              <article key={step.title} className="feature-card">
                <div className="feature-card__icon">✓</div>
                <h3>{step.title}</h3>
                <p>{step.detail}</p>
              </article>
            ))}
          </div>

          <section className="material-section">
            <h3 className="section-heading">샘플 코드</h3>
            <p className="auth-subtext">임베드 버튼 클릭 시 제품 이미지와 고객 사진을 수집해 Generate 요청을 보내는 예시입니다.</p>
            <pre className="code-block">
              <code>{demoSnippet}</code>
            </pre>
          </section>

          <section className="material-section">
            <h3 className="section-heading">Tip</h3>
            <ul className="material-list">
              <li>Generate 요청은 평균 10초 내외가 소요되므로, 스피너나 프로그레스 애니메이션으로 기다리는 시간을 안내해 주세요.</li>
              <li>제품 이미지는 현재 더미 파일을 사용 중이며, 쇼핑몰 API와 연동 시 동일한 FormData 필드에 실제 이미지를 넣으면 됩니다.</li>
              <li>고객 식별자를 customer_id로 전달하면, 쇼핑몰 측에서 생성된 이미지를 고객 주문 흐름에 연결하기 쉽습니다.</li>
            </ul>
          </section>
        </div>
      </div>
    </PageLayout>
  )
}

export default GenerateDemo
