import React, { useEffect, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import axios from 'axios';
import { CheckCircle, AlertCircle, CreditCard, ExternalLink, RefreshCw } from 'lucide-react';
import { toast } from 'sonner';

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;

const DashboardPayments = () => {
  const [searchParams] = useSearchParams();
  const [status, setStatus] = useState(null);
  const [loading, setLoading] = useState(true);
  const [connecting, setConnecting] = useState(false);
  const venue = JSON.parse(localStorage.getItem('qrgate_venue') || '{}');
  const token = localStorage.getItem('qrgate_token');
  const headers = { Authorization: `Bearer ${token}` };

  const fetchStatus = async () => {
    try {
      const res = await axios.get(`${BACKEND_URL}/api/dashboard/stripe/status`, { headers });
      if (!res.data.stripe_onboarded) {
        // Auto-connect instead of waiting
        await handleConnect();
      } else {
        setStatus(res.data);
        if (res.data.stripe_onboarded) {
          const stored = JSON.parse(localStorage.getItem('qrgate_venue') || '{}');
          stored.stripe_onboarded = true;
          localStorage.setItem('qrgate_venue', JSON.stringify(stored));
        }
        setLoading(false);
      }
    } catch (e) {
      console.error(e);
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchStatus();
    if (searchParams.get('connected') === 'true') {
      toast.success('Stripe Connect collegato con successo!');
    }
  }, []);

  const handleConnect = async () => {
    setConnecting(true);
    try {
      const res = await axios.post(`${BACKEND_URL}/api/dashboard/stripe/connect`, {}, { headers });
      if (res.data.mock || res.data.stripe_onboarded) {
        toast.success('Pagamenti attivati automaticamente!');
        const statusRes = await axios.get(`${BACKEND_URL}/api/dashboard/stripe/status`, { headers });
        setStatus(statusRes.data);
        const stored = JSON.parse(localStorage.getItem('qrgate_venue') || '{}');
        stored.stripe_onboarded = true;
        localStorage.setItem('qrgate_venue', JSON.stringify(stored));
      } else if (res.data.onboarding_url) {
        window.location.href = res.data.onboarding_url;
      }
    } catch (e) {
      toast.error(e.response?.data?.detail || 'Errore connessione Stripe');
    } finally {
      setConnecting(false);
      setLoading(false);
    }
  };

  if (loading) return <div className="text-center py-12">Caricamento e attivazione in corso...</div>;

  const isConnected = status?.stripe_onboarded;
  const isMock = status?.mock;

  return (
    <div data-testid="payments-page">
      <div className="mb-8">
        <h2 className="text-[#0F0F0F]">Pagamenti</h2>
        <p className="text-[#6B6867] mt-1">Gestisci il tuo account Stripe Connect per ricevere i pagamenti</p>
      </div>

      <div className="grid md:grid-cols-2 gap-6">
        {/* Status Card */}
        <div className="bg-white rounded-2xl p-6 border border-[#E5E1D9] shadow-card">
          <div className="flex items-center gap-3 mb-4">
            <CreditCard className="w-6 h-6 text-[#0F0E0C]" />
            <h3 className="font-semibold text-[#0F0F0F]">Stato Stripe Connect</h3>
          </div>

          {isConnected ? (
            <div>
              <div className="flex items-center gap-2 mb-4">
                <CheckCircle className="w-6 h-6 text-[#D4A853]" />
                <div>
                  <p className="font-semibold text-[#D4A853]">{isMock ? 'Demo attivo' : 'Account attivo'}</p>
                  <p className="text-sm text-[#6B6867]">{isMock ? 'Modalità demo — aggiungi chiavi Stripe reali per i pagamenti veri' : 'Pagamenti abilitati — accrediti entro 2-5 giorni lavorativi'}</p>
                </div>
              </div>
              {isMock && (
                <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 text-sm text-amber-800">
                  <p className="font-semibold mb-1">Come attivare pagamenti reali:</p>
                  <ol className="list-decimal list-inside space-y-1 text-xs">
                    <li>Vai su <a href="https://dashboard.stripe.com" target="_blank" rel="noopener noreferrer" className="underline">dashboard.stripe.com</a></li>
                    <li>Crea un account gratuito</li>
                    <li>Copia le chiavi API (sk_test_...)</li>
                    <li>Aggiungi STRIPE_SECRET_KEY nel backend .env</li>
                  </ol>
                </div>
              )}
              {!isMock && status?.stripe_account_id && (
                <p className="text-xs text-[#6B6867] font-mono">{status.stripe_account_id}</p>
              )}
            </div>
          ) : (
            <div>
              <div className="flex items-center gap-2 mb-4">
                <AlertCircle className="w-6 h-6 text-amber-500" />
                <div>
                  <p className="font-semibold text-[#0F0F0F]">Non collegato</p>
                  <p className="text-sm text-[#6B6867]">Collega Stripe per ricevere pagamenti</p>
                </div>
              </div>
              <button onClick={handleConnect} disabled={connecting} data-testid="connect-stripe-btn"
                className="w-full py-3 bg-[#0F0E0C] text-white rounded-xl font-semibold hover:bg-[#292524] transition-all disabled:opacity-50 flex items-center justify-center gap-2">
                {connecting ? <RefreshCw className="w-4 h-4 animate-spin" /> : null}
                {connecting ? 'Collegamento...' : 'Collega Stripe Connect →'}
              </button>
            </div>
          )}
        </div>

        {/* Info Card */}
        <div className="bg-white rounded-2xl p-6 border border-[#E5E1D9] shadow-card">
          <h3 className="font-semibold text-[#0F0F0F] mb-4">Come funziona</h3>
          <div className="space-y-4 text-sm">
            <div className="flex gap-3">
              <div className="w-6 h-6 rounded-full bg-[#F5F2EC] flex items-center justify-center text-xs font-bold text-[#0F0E0C] flex-shrink-0">1</div>
              <div>
                <p className="font-medium text-[#0F0F0F]">Il visitatore paga</p>
                <p className="text-[#6B6867]">Carta di credito sicura via Stripe</p>
              </div>
            </div>
            <div className="flex gap-3">
              <div className="w-6 h-6 rounded-full bg-[#F5F2EC] flex items-center justify-center text-xs font-bold text-[#0F0E0C] flex-shrink-0">2</div>
              <div>
                <p className="font-medium text-[#0F0F0F]">QRGate trattiene la commissione</p>
                <p className="text-[#6B6867]">€0,49 + 5% per biglietto automaticamente</p>
              </div>
            </div>
            <div className="flex gap-3">
              <div className="w-6 h-6 rounded-full bg-[#F5F2EC] flex items-center justify-center text-xs font-bold text-[#0F0E0C] flex-shrink-0">3</div>
              <div>
                <p className="font-medium text-[#0F0F0F]">Ricevi il saldo</p>
                <p className="text-[#6B6867]">Entro 2-5 giorni lavorativi sul tuo IBAN</p>
              </div>
            </div>
          </div>
          <div className="mt-4 p-3 bg-[#F5F2EC] rounded-xl text-xs text-[#6B6867]">
            Commissione: €0,49 + 5% per biglietto. Nessun canone mensile.
          </div>
        </div>
      </div>
    </div>
  );
};

export default DashboardPayments;
