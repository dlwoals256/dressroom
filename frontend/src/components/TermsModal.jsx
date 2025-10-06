import React from 'react'

const TermsModal = ({ open, onClose, onAccept }) => {
  if (!open) return null

  return (
    <div className="modal-overlay">
      <div className="modal-panel">
        <header className="modal-header">
          <h3>서비스 이용 약관</h3>
        </header>
        <div className="modal-content">
          <p>
            Dressroom 서비스는 쇼핑몰을 통해 쇼핑몰을 이용하는 유져(이하 "쇼핑몰 유져")에게
            쇼핑몰의 제품을 가상으로 시착해볼 수 있게 하는 서비스로, 쇼핑몰을 운영하는 사업자(이하 "사업자")와
            본 서비스를 직접적으로 이용하는 최종 고객인 쇼핑몰 유저에 대한 개인정보 처리 및
            상점 관리 정책이 존재한다.
            업로드하는 모든 이미지는 시연용으로만 사용되며, 생성된 결과물은 24시간 이내에 삭제된다.
            상점과 관련된 정보(회사명, 사업자등록번호, 연락처)는 서비스 운영 및 고객 지원을 위해서만
            활용되고 제3자에게 공유되지 않는다.
          </p>
          <p>
            자세한 내용은 관리자에게 문의하시거나 서비스 운영 정책 문서를 참고해 주세요. 약관에 동의하지
            않으시면 회원가입을 진행하실 수 없습니다.
          </p>
        </div>
        <footer className="modal-footer">
          <button className="material-btn-outlined" type="button" onClick={onClose}>
            닫기
          </button>
          <button className="material-btn" type="button" onClick={onAccept}>
            약관에 동의합니다
          </button>
        </footer>
      </div>
    </div>
  )
}

export default TermsModal
