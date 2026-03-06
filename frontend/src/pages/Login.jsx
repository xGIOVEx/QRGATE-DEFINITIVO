import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Link, useNavigate } from 'react-router-dom';
import axios from 'axios';
import { Eye, EyeOff, QrCode, AlertCircle } from 'lucide-react';
import { toast } from 'sonner';
import LanguageToggle from '@/components/LanguageToggle';

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;

const Login = () => {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [errors, setErrors] = useState({});

  const validateForm = () => {
    const newErrors = {};

    if (!email) {
      newErrors.email = t('common.required');
    } else if (!/\S+@\S+\.\S+/.test(email)) {
      newErrors.email = 'Email non valida';
    }

    if (!password) {
      newErrors.password = t('common.required');
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleLogin = async (e) => {
    e.preventDefault();

    if (!validateForm()) return;

    setLoading(true);
    setErrors({});

    try {
      const response = await axios.post(`${BACKEND_URL}/api/auth/login`, {
        email,
        password,
      });

      localStorage.setItem('qrgate_token', response.data.token);
      localStorage.setItem('qrgate_user', JSON.stringify(response.data.user));
      localStorage.setItem('qrgate_venue', JSON.stringify(response.data.venue));
      toast.success(t('common.success'));
      if (response.data.user?.role === 'superadmin') {
        navigate('/admin');
      } else if (response.data.user?.role === 'scanner') {
        navigate('/scanner');
      } else {
        navigate('/dashboard');
      }
    } catch (error) {
      const errorMsg = error.response?.data?.error || error.response?.data?.detail || 'Errore di connessione';
      toast.error(errorMsg);
      setErrors({ submit: errorMsg });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-stone-50 flex items-center justify-center px-4 font-sans selection:bg-stone-950/10">
      <div className="absolute top-4 right-4">
        <LanguageToggle />
      </div>

      <div className="w-full max-w-md">
        <Link to="/" className="flex flex-col items-center justify-center gap-4 mb-8 group">
          <div className="w-12 h-12 bg-stone-950 rounded-xl flex items-center justify-center shadow-lg group-hover:scale-105 transition-transform">
            <QrCode className="w-7 h-7 text-white" strokeWidth={2.5} />
          </div>
          <span className="text-2xl font-black tracking-tighter text-stone-950">QRGate</span>
        </Link>

        <div className="bg-white rounded-3xl border border-stone-200 shadow-2xl shadow-stone-200/50 p-10" data-testid="login-form">
          <h2 className="text-2xl font-black text-stone-950 mb-2">{t('auth.loginTitle')}</h2>
          <p className="text-stone-500 text-sm mb-8 font-medium">Bentornato. Accedi per gestire la tua struttura.</p>

          {errors.submit && (
            <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-xl flex items-start gap-2 text-sm text-red-700">
              <AlertCircle className="w-4 h-4 mt-0.5 flex-shrink-0" />
              <span>{errors.submit}</span>
            </div>
          )}

          <form onSubmit={handleLogin} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-[#0F0F0F] mb-2">
                {t('onboarding.email')}
              </label>
              <input
                type="email"
                value={email}
                onChange={(e) => {
                  setEmail(e.target.value);
                  if (errors.email) setErrors(prev => ({ ...prev, email: null }));
                }}
                data-testid="email-input"
                className={`w-full px-4 py-3 bg-white border rounded-xl focus:outline-none focus:ring-4 transition-all ${errors.email
                  ? 'border-red-300 focus:ring-red-100'
                  : 'border-stone-200 focus:border-stone-800 focus:ring-stone-800/5'
                  }`}
              />
              {errors.email && (
                <p className="mt-1 text-sm text-red-600">{errors.email}</p>
              )}
            </div>

            <div>
              <label className="block text-sm font-medium text-[#0F0F0F] mb-2">
                {t('onboarding.password')}
              </label>
              <div className="relative">
                <input
                  type={showPassword ? 'text' : 'password'}
                  value={password}
                  onChange={(e) => {
                    setPassword(e.target.value);
                    if (errors.password) setErrors(prev => ({ ...prev, password: null }));
                  }}
                  data-testid="password-input"
                  className={`w-full px-4 py-3 bg-white border rounded-xl focus:outline-none focus:ring-4 transition-all ${errors.password
                    ? 'border-red-300 focus:ring-red-100'
                    : 'border-stone-200 focus:border-stone-800 focus:ring-stone-800/5'
                    }`}
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-[#6B6867] hover:text-[#0F0F0F] transition-colors"
                >
                  {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                </button>
              </div>
              {errors.password && (
                <p className="mt-1 text-sm text-red-600">{errors.password}</p>
              )}
            </div>

            <div className="text-right">
              <Link to="/forgot-password" size="sm" className="text-sm text-stone-950 font-bold hover:underline">
                Password dimenticata?
              </Link>
            </div>

            <button
              type="submit"
              disabled={loading}
              data-testid="login-submit-button"
              className="w-full px-6 py-4 bg-stone-950 text-white rounded-xl font-bold hover:bg-stone-900 transition-all disabled:opacity-50 disabled:cursor-not-allowed shadow-xl shadow-stone-950/20 active:scale-[0.98]"
            >
              {loading ? t('common.loading') : t('auth.login')}
            </button>
          </form>

          <p className="text-center text-sm text-stone-500 mt-8 font-medium">
            {t('auth.dontHaveAccount')}{' '}
            <Link to="/register" className="text-stone-950 font-bold hover:underline">
              {t('auth.signUpHere')}
            </Link>
          </p>
        </div>

        <p className="text-center text-xs text-[#6B6867] mt-4">
          📝 Demo: demo@qrgate.com / Demo1234!
        </p>
      </div>
    </div>
  );
};

export default Login;