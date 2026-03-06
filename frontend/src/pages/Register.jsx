import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Link, useNavigate } from 'react-router-dom';
import axios from 'axios';
import { Eye, EyeOff, QrCode } from 'lucide-react';
import { toast } from 'sonner';
import LanguageToggle from '@/components/LanguageToggle';

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;

const Register = () => {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);

  const handleRegister = async (e) => {
    e.preventDefault();
    setLoading(true);

    try {
      const response = await axios.post(`${BACKEND_URL}/api/auth/register`, {
        name,
        email,
        password,
      });

      localStorage.setItem('qrgate_token', response.data.token);
      localStorage.setItem('qrgate_venue', JSON.stringify(response.data.venue));

      toast.success(t('common.success'));
      navigate('/onboarding');
    } catch (error) {
      toast.error(error.response?.data?.detail || t('common.error'));
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

        <div className="bg-white rounded-3xl border border-stone-200 shadow-2xl shadow-stone-200/50 p-10" data-testid="register-form">
          <h2 className="text-2xl font-black text-stone-950 mb-2">{t('auth.registerTitle')}</h2>
          <p className="text-stone-500 text-sm mb-8 font-medium">Inizia ora la rivoluzione della tua biglietteria.</p>

          <form onSubmit={handleRegister} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-[#0F0F0F] mb-2">
                {t('onboarding.venueName')}
              </label>
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                required
                placeholder={t('onboarding.venueNamePlaceholder')}
                data-testid="venue-name-input"
                className="w-full px-4 py-3 bg-white border border-stone-200 rounded-xl focus:outline-none focus:ring-4 focus:ring-stone-800/5 focus:border-stone-800 transition-all font-medium"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-[#0F0F0F] mb-2">
                {t('onboarding.email')}
              </label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                data-testid="email-input"
                className="w-full px-4 py-3 bg-white border border-stone-200 rounded-xl focus:outline-none focus:ring-4 focus:ring-stone-800/5 focus:border-stone-800 transition-all font-medium"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-[#0F0F0F] mb-2">
                {t('onboarding.password')}
              </label>
              <div className="relative">
                <input
                  type={showPassword ? 'text' : 'password'}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  data-testid="password-input"
                  className="w-full px-4 py-3 bg-white border border-stone-200 rounded-xl focus:outline-none focus:ring-4 focus:ring-stone-800/5 focus:border-stone-800 transition-all font-medium"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-[#6B6867]"
                >
                  {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                </button>
              </div>
            </div>

            <button
              type="submit"
              disabled={loading}
              data-testid="register-submit-button"
              className="w-full px-6 py-4 bg-stone-950 text-white rounded-xl font-bold hover:bg-stone-900 transition-all disabled:opacity-50 shadow-xl shadow-stone-950/20 active:scale-[0.98]"
            >
              {loading ? t('common.loading') : t('auth.register')}
            </button>
          </form>

          <p className="text-center text-sm text-stone-500 mt-8 font-medium">
            {t('auth.alreadyHaveAccount')}{' '}
            <Link to="/login" className="text-stone-950 font-bold hover:underline">
              {t('auth.signInHere')}
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
};

export default Register;