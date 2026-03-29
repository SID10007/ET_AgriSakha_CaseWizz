import React from 'react';
import ReactDOM from 'react-dom/client';
import { RouterProvider } from 'react-router-dom';
// import { router } from './routes';
// import App from './App.tsx';
import './index.css';
// import EyMain from './components/EyMain';
import App from './App';
// import RuralKnowledgeAssistant from './components/ey';
import EyMain from './components/EyMain';
import { createBrowserRouter } from 'react-router-dom';
import EyBuget from './components/EyBuget';
import LoanQueryAssistant from './components/LoanQueryAssistant';
import InvestmentRecommendations from './components/InvestmentRecommendations';
import RuralFinancialNews from './components/RuralFinancialNews';
import OCR from './components/OCR';
import Testing from './components/Testing';
import AgriGenie from './components/AgriGenie';
import { AuthProvider } from './contexts/AuthContext';

export const router = createBrowserRouter([
  {
    path: '/',
    element: <App />,
  },
  {
    path: '/rural-assistant',
    element: <EyMain />,
  },
  {
    path: '/budget-assistant',
    element: <EyBuget />,
  },
  {
    path: '/agri-assistant',
    element: <AgriGenie />,
  },
  {
    path: '/loan-assistant',
    element: <LoanQueryAssistant />,
  },
  {
    path: '/investment-assistant',
    element: <InvestmentRecommendations />,
  },
  {
    path: '/rural-financial-news',
    element: <RuralFinancialNews />,
  },
  {
    path: '/ocr',
    element: <OCR/>
  },
  {
    path: '/testing',
    element: <Testing/>
  },
  {
    path: '/agri-assistant',
    element: <AgriGenie/>
  }
]);

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <AuthProvider>
      <RouterProvider router={router} />
    </AuthProvider>
  </React.StrictMode>
);
