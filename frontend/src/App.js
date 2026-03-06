import React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { I18nextProvider } from 'react-i18next';
import i18n from '@/i18n';
import '@/App.css';

// Pages
import Homepage from '@/pages/Homepage';
import Login from '@/pages/Login';
import Register from '@/pages/Register';
import Onboarding from '@/pages/Onboarding';
import Dashboard from '@/pages/Dashboard';
import VenueLanding from '@/pages/VenueLanding';
import Checkout from '@/pages/Checkout';
import Success from '@/pages/Success';
import Scanner from '@/pages/Scanner';
import ReviewAgents from '@/pages/ReviewAgents';
import AdminPanel from '@/pages/AdminPanel';
import ForgotPassword from '@/pages/ForgotPassword';
import ResetPassword from '@/pages/ResetPassword';
import Pricing from '@/pages/Pricing';
import NotFound from '@/pages/NotFound';
import VisitorGuide from '@/pages/VisitorGuide';

// Components
import ChatbotWidget from '@/components/ChatbotWidget';
import CookieBanner from '@/components/CookieBanner';
import ExitIntentPopup from '@/components/ExitIntentPopup';
import { Toaster } from '@/components/ui/sonner';
import ErrorBoundary from '@/components/ErrorBoundary';

// Auth guard: redirect to /login if no token in localStorage
const PrivateRoute = ({ element }) => {
  const token = localStorage.getItem('qrgate_token');
  return token ? element : <Navigate to="/login" replace />;
};

function App() {
  return (
    <I18nextProvider i18n={i18n}>
      <ErrorBoundary>
        <div className="App">
          <BrowserRouter>
            <Routes>
              <Route path="/" element={<Homepage />} />
              <Route path="/pricing" element={<Pricing />} />
              <Route path="/login" element={<Login />} />
              <Route path="/register" element={<Register />} />
              <Route path="/forgot-password" element={<ForgotPassword />} />
              <Route path="/reset-password" element={<ResetPassword />} />
              <Route path="/onboarding/*" element={<PrivateRoute element={<Onboarding />} />} />
              <Route path="/dashboard/*" element={<PrivateRoute element={<Dashboard />} />} />
              <Route path="/dashboard/review-agents" element={<PrivateRoute element={<ReviewAgents />} />} />
              <Route path="/admin/*" element={<PrivateRoute element={<AdminPanel />} />} />
              <Route path="/scanner" element={<PrivateRoute element={<Scanner />} />} />
              <Route path="/:slug" element={<VenueLanding />} />
              <Route path="/:slug/checkout" element={<Checkout />} />
              <Route path="/:slug/success" element={<Success />} />

              {/* SEO Multilingual Routes (Hreflang Targets) */}
              <Route path="/:lang/:slug" element={<VenueLanding />} />
              <Route path="/:lang/:slug/checkout" element={<Checkout />} />
              <Route path="/:lang/:slug/success" element={<Success />} />
              <Route path="/guide/:sessionToken" element={<VisitorGuide />} />
              <Route path="*" element={<NotFound />} />
            </Routes>
            <ChatbotWidget />
            <CookieBanner />
            <ExitIntentPopup />
            <Toaster />
          </BrowserRouter>
        </div>
      </ErrorBoundary>
    </I18nextProvider>
  );
}

export default App;