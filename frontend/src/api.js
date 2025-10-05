// src/api.js
import axios from 'axios';

// ✅ [1] axios 인스턴스를 생성합니다.
const api = axios.create({
  // Django 서버의 기본 URL을 설정합니다.
  baseURL: 'http://127.0.0.1:8000/api/users/', 
});

// ✅ [2] 로그인 성공 후 토큰을 헤더에 추가하는 함수 (나중에 사용)
export const setAuthToken = (token) => {
  if (token) {
    // 토큰이 있으면 모든 요청의 Authorization 헤더에 Bearer 토큰을 추가합니다.
    api.defaults.headers.common['Authorization'] = `Bearer ${token}`;
  } else {
    // 토큰이 없으면 헤더를 삭제합니다.
    delete api.defaults.headers.common['Authorization'];
  }
};

export default api;