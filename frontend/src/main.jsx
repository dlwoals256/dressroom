// src/main.jsx
import React from 'react'
import ReactDOM from 'react-dom/client'
import App from './App.jsx'
import './index.css'
import './i18n'

// ✅ [1] react-router-dom에서 필요한 기능들을 가져옵니다.
import { createBrowserRouter, RouterProvider } from 'react-router-dom';

// ✅ [2] 우리가 만든 페이지 컴포넌트들을 가져옵니다.
import LandingPage from './pages/LandingPage.jsx';
import LoginPage from './pages/LoginPage.jsx';
import RegisterPage from './pages/RegisterPage.jsx';
import DashboardPage from './pages/DashboardPage.jsx';
import ShopDetail from './pages/ShopDetail.jsx';
import GenerateDemo from './pages/GenerateDemo.jsx';

// ✅ [3] 라우터 설정을 정의합니다.
const router = createBrowserRouter([
  {
    path: '/',
    element: <LandingPage />,
  },
  {
    path: '/login',
    element: <LoginPage />,
  },
  {
    path: '/register',
    element: <RegisterPage />,
  },
  {
    path: '/dashboard',
    element: <DashboardPage />,
  },
  {
    path: '/shops/:shopId',
    element: <ShopDetail />,
  },
  {
    path: '/demo',
    element: <GenerateDemo />,
  },
]);

// ✅ [4] 앱 전체에 라우터 설정을 적용합니다.
ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <RouterProvider router={router} />
  </React.StrictMode>,
)
