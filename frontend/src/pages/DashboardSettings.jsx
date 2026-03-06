import React, { useEffect, useState, useCallback } from 'react';
import axios from 'axios';
import { Save, QrCode, Copy, Check, Download, ExternalLink, Wallet, Smartphone, ShieldCheck } from 'lucide-react';
import { toast } from 'sonner';

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;
const FRONTEND_URL = process.env.REACT_APP_BACKEND_URL?.replace('/api', '') || '';

const DashboardSettings = () => {
  const [venue, setVenue] = useState(null);
  const [form, setForm] = useState({});
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [copied, setCopied] = useState(false);
  const [previewKey, setPreviewKey] = useState(0);
  const [logoPreview, setLogoPreview] = useState(null);

  // Wallet config state
  const [walletForm, setWalletForm] = useState({
    google_wallet_issuer_id: '',
    google_wallet_service_account_email: '',
    google_wallet_private_key: '',
    apple_wallet_pass_type_id: '',
    apple_wallet_team_id: '',
    apple_wallet_certificate: '',
    apple_wallet_key: '',
  });
  const [walletStatus, setWalletStatus] = useState({ google: false, apple: false });
  const [walletSaving, setWalletSaving] = useState(false);

  const token = localStorage.getItem('qrgate_token');
  const headers = { Authorization: `Bearer ${token}` };

  const handleLogoUpload = (e) => {
    const file = e.target.files[0];
    if (!file) return;
    if (file.size > 2 * 1024 * 1024) {
      toast.error('Immagine troppo grande (max 2MB)');
      return;
    }
    const reader = new FileReader();
    reader.onloadend = () => {
      setLogoPreview(reader.result);
      setForm(f => ({ ...f, logo_url: reader.result }));
    };
    reader.readAsDataURL(file);
  };

  const fetchVenueData = useCallback(async () => {
    try {
      const res = await axios.get(`${BACKEND_URL}/api/dashboard/settings`, { headers: { Authorization: `Bearer ${token}` } });
      setVenue(res.data);
      setForm({
        name: res.data.name || '',
        description: res.data.description || '',
        description_en: res.data.description_en || '',
        address: res.data.address || '',
        opening_hours: res.data.opening_hours || '',
        opening_hours_en: res.data.opening_hours_en || '',
        website_url: res.data.website_url || '',
        iban: res.data.iban || '',
        logo_url: res.data.logo_url || '',
        fee_mode: res.data.fee_mode || 'included',
        donation_enabled: res.data.donation_enabled || false,
        meta_pixel_id: res.data.meta_pixel_id || '',
        google_analytics_id: res.data.google_analytics_id || '',
      });
    } catch (e) {
      toast.error('Errore caricamento impostazioni');
    } finally {
      setLoading(false);
    }
  }, [token]);

  useEffect(() => {
    fetchVenueData();
  }, [fetchVenueData]);

  // Fetch wallet configuration
  useEffect(() => {
    const fetchWalletConfig = async () => {
      try {
        const res = await axios.get(`${BACKEND_URL}/api/admin/wallet-config`, { headers: { Authorization: `Bearer ${token}` } });
        const data = res.data;
        setWalletStatus({
          google: data.google_wallet?.configured || false,
          apple: data.apple_wallet?.configured || false,
        });
        setWalletForm(prev => ({
          ...prev,
          google_wallet_issuer_id: data.google_wallet?.issuer_id || '',
          google_wallet_service_account_email: data.google_wallet?.service_account_email || '',
          apple_wallet_pass_type_id: data.apple_wallet?.pass_type_id || '',
          apple_wallet_team_id: data.apple_wallet?.team_id || '',
        }));
      } catch {
        // Wallet config not available — ignore
      }
    };
    if (token) fetchWalletConfig();
  }, [token]);

  const handleSaveWallet = async () => {
    setWalletSaving(true);
    try {
      const payload = {};
      Object.entries(walletForm).forEach(([k, v]) => {
        if (v && v.trim()) payload[k] = v.trim();
      });
      await axios.put(`${BACKEND_URL}/api/admin/wallet-config`, payload, { headers });
      toast.success('Configurazione Wallet salvata!');
      // Refresh status
      const res = await axios.get(`${BACKEND_URL}/api/admin/wallet-config`, { headers });
      setWalletStatus({
        google: res.data.google_wallet?.configured || false,
        apple: res.data.apple_wallet?.configured || false,
      });
    } catch {
      toast.error('Errore salvataggio configurazione Wallet');
    } finally {
      setWalletSaving(false);
    }
  };

  const handleSave = async (e) => {
    e.preventDefault();
    setSaving(true);
    try {
      const res = await axios.put(`${BACKEND_URL}/api/dashboard/settings`, form, { headers });
      setVenue(res.data);
      localStorage.setItem('qrgate_venue', JSON.stringify(res.data));
      setPreviewKey(prev => prev + 1); // Force iframe to reload
      toast.success('Impostazioni salvate');
    } catch (e) {
      toast.error(e.response?.data?.detail || 'Errore salvataggio');
    } finally {
      setSaving(false);
    }
  };

  const downloadPoster = async () => {
    try {
      const res = await axios.get(`${BACKEND_URL}/api/dashboard/poster/download`, {
        headers, responseType: 'blob'
      });
      const url = window.URL.createObjectURL(new Blob([res.data]));
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', `poster-${venue?.slug || 'qrgate'}.pdf`);
      document.body.appendChild(link);
      link.click();
      link.remove();
      toast.success('Poster PDF scaricato');
    } catch (e) {
      toast.error('Errore download poster');
    }
  };

  const copyLink = () => {
    const link = `${process.env.REACT_APP_BACKEND_URL?.replace('/api', '')}/${venue?.slug}`;
    navigator.clipboard.writeText(link);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  if (loading) return <div className="text-center py-12">Caricamento...</div>;

  return (
    <div className="h-[calc(100vh-8rem)] flex flex-col" data-testid="settings-page">
      <div className="mb-6 flex justify-between items-end shrink-0">
        <div>
          <h2 className="text-3xl font-extrabold text-[#0F0F0F] tracking-tight">Impostazioni & Vetrina</h2>
          <p className="text-[#6B6867] mt-1 font-medium">Configura il tuo brand e vedi le modifiche in tempo reale.</p>
        </div>
        <button
          onClick={handleSave}
          disabled={saving}
          data-testid="save-settings-btn"
          className="flex items-center gap-2 px-8 py-3 bg-[#0F0E0C] text-white rounded-xl font-bold hover:brightness-110 transition-all shadow-xl active:scale-95 disabled:opacity-50"
        >
          <Save className="w-5 h-5" />
          {saving ? 'Salvataggio...' : 'Pubblica Modifiche'}
        </button>
      </div>

      <div className="grid lg:grid-cols-2 gap-8 flex-1 min-h-0">
        {/* LEFT COLUMN: EDITOR */}
        <div className="overflow-y-auto pr-2 pb-12 space-y-6 custom-scrollbar">
          <form className="space-y-6">
            {/* Venue Info */}
            <div className="bg-white rounded-2xl border border-[#E5E1D9] p-6 shadow-card">
              <h3 className="font-semibold text-[#0F0F0F] mb-4">Informazioni luogo</h3>
              <div className="grid gap-4">
                {/* Logo upload */}
                <div>
                  <label className="block text-sm font-medium mb-2">Logo venue</label>
                  <div className="flex items-center gap-4">
                    {(logoPreview || venue?.logo_url) && (
                      <img src={logoPreview || venue?.logo_url} alt="logo" className="w-16 h-16 rounded-xl object-cover border border-[#E5E1D9]" />
                    )}
                    <label className="flex items-center gap-2 px-4 py-2 border-2 border-dashed border-[#E5E1D9] rounded-xl cursor-pointer hover:border-[#0F0E0C] transition-colors text-sm text-[#6B6867]">
                      <input type="file" accept="image/*" onChange={handleLogoUpload} className="hidden" />
                      {(logoPreview || venue?.logo_url) ? 'Cambia logo' : '+ Carica logo'}
                    </label>
                  </div>
                  <p className="text-xs text-[#6B6867] mt-1">PNG o JPG, max 2MB</p>
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1">Nome luogo *</label>
                  <input value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} required
                    className="w-full px-4 py-2 border border-[#E5E1D9] rounded-xl focus:outline-none focus:ring-2 focus:ring-[#0F0E0C]" />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1">Descrizione (IT)</label>
                  <textarea value={form.description} onChange={e => setForm({ ...form, description: e.target.value })} rows={3}
                    className="w-full px-4 py-2 border border-[#E5E1D9] rounded-xl focus:outline-none focus:ring-2 focus:ring-[#0F0E0C] resize-none" />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1">Descrizione (EN)</label>
                  <textarea value={form.description_en} onChange={e => setForm({ ...form, description_en: e.target.value })} rows={3}
                    className="w-full px-4 py-2 border border-[#E5E1D9] rounded-xl focus:outline-none focus:ring-2 focus:ring-[#0F0E0C] resize-none" />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1">Indirizzo</label>
                  <input value={form.address} onChange={e => setForm({ ...form, address: e.target.value })}
                    className="w-full px-4 py-2 border border-[#E5E1D9] rounded-xl focus:outline-none focus:ring-2 focus:ring-[#0F0E0C]" />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium mb-1">Orari (IT)</label>
                    <input value={form.opening_hours} onChange={e => setForm({ ...form, opening_hours: e.target.value })}
                      placeholder="es. Mar-Dom 9:00-18:00"
                      className="w-full px-4 py-2 border border-[#E5E1D9] rounded-xl focus:outline-none focus:ring-2 focus:ring-[#0F0E0C]" />
                  </div>
                  <div>
                    <label className="block text-sm font-medium mb-1">Orari (EN)</label>
                    <input value={form.opening_hours_en} onChange={e => setForm({ ...form, opening_hours_en: e.target.value })}
                      placeholder="e.g. Tue-Sun 9:00-18:00"
                      className="w-full px-4 py-2 border border-[#E5E1D9] rounded-xl focus:outline-none focus:ring-2 focus:ring-[#0F0E0C]" />
                  </div>
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1">Sito web</label>
                  <input type="url" value={form.website_url} onChange={e => setForm({ ...form, website_url: e.target.value })}
                    placeholder="https://..."
                    className="w-full px-4 py-2 border border-[#E5E1D9] rounded-xl focus:outline-none focus:ring-2 focus:ring-[#0F0E0C]" />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1">IBAN</label>
                  <input value={form.iban} onChange={e => setForm({ ...form, iban: e.target.value })}
                    placeholder="IT60X0542811101000000123456"
                    className="w-full px-4 py-2 border border-[#E5E1D9] rounded-xl focus:outline-none focus:ring-2 focus:ring-[#0F0E0C]" />
                </div>
              </div>
            </div>

            {/* Fee Mode */}
            <div className="bg-white rounded-2xl border border-[#E5E1D9] p-6 shadow-card">
              <h3 className="font-semibold text-[#0F0F0F] mb-4">Commissione</h3>
              <div className="grid sm:grid-cols-2 gap-3">
                {[
                  { value: 'included', label: 'Inclusa nel prezzo', desc: 'Migliore conversione. Il visitatore vede solo il prezzo finale.' },
                  { value: 'separate', label: 'Mostrata separatamente', desc: 'Utile per enti pubblici. Il visitatore vede prezzo + commissione.' },
                ].map(opt => (
                  <label key={opt.value} className={`p-4 border-2 rounded-xl cursor-pointer transition-all ${form.fee_mode === opt.value ? 'border-[#0F0E0C] bg-blue-50' : 'border-[#E5E1D9]'}`}>
                    <input type="radio" name="fee_mode" value={opt.value} checked={form.fee_mode === opt.value}
                      onChange={e => setForm({ ...form, fee_mode: e.target.value })} className="sr-only" />
                    <p className="font-medium text-[#0F0F0F] mb-1">{opt.label}</p>
                    <p className="text-xs text-[#6B6867]">{opt.desc}</p>
                  </label>
                ))}
              </div>
              <div className="mt-4 flex items-center gap-3">
                <input type="checkbox" id="donation" checked={form.donation_enabled}
                  onChange={e => setForm({ ...form, donation_enabled: e.target.checked })}
                  className="w-4 h-4 accent-[#0F0E0C]" />
                <label htmlFor="donation" className="text-sm font-medium text-[#0F0F0F] cursor-pointer">
                  Abilita donazione facoltativa al checkout
                </label>
              </div>
            </div>

            {/* Tracking & Marketing */}
            <div className="bg-white rounded-2xl border border-[#E5E1D9] p-6 shadow-card">
              <h3 className="font-semibold text-[#0F0F0F] mb-4">Tracking Marketing</h3>
              <p className="text-sm text-[#6B6867] mb-4">Traccia le conversioni inserendo gli ID dei tuoi pixel pubblicitari. Saranno iniettati nella pagina di checkout pubblica.</p>
              <div className="grid gap-4">
                <div>
                  <label className="block text-sm font-medium mb-1">Meta (Facebook) Pixel ID</label>
                  <input value={form.meta_pixel_id} onChange={e => setForm({ ...form, meta_pixel_id: e.target.value })}
                    placeholder="Es. 123456789012345"
                    className="w-full px-4 py-2 border border-[#E5E1D9] rounded-xl focus:outline-none focus:ring-2 focus:ring-[#0F0E0C] text-sm" />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1">Google Analytics ID</label>
                  <input value={form.google_analytics_id} onChange={e => setForm({ ...form, google_analytics_id: e.target.value })}
                    placeholder="Es. G-XXXXXXXXXX"
                    className="w-full px-4 py-2 border border-[#E5E1D9] rounded-xl focus:outline-none focus:ring-2 focus:ring-[#0F0E0C] text-sm" />
                </div>
              </div>
            </div>

            {/* ── Wallet Digitale ────────────────────────────────────── */}
            <div className="bg-white rounded-2xl border border-[#E5E1D9] p-6 shadow-card">
              <div className="flex items-center justify-between mb-4">
                <h3 className="font-semibold text-[#0F0F0F] flex items-center gap-2">
                  <Wallet className="w-5 h-5 text-[#0F0E0C]" />
                  Wallet Digitale
                </h3>
                <div className="flex items-center gap-2">
                  <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold ${walletStatus.apple ? 'bg-emerald-100 text-emerald-700' : 'bg-red-100 text-red-600'}`}>
                    Apple {walletStatus.apple ? '✓' : '✕'}
                  </span>
                  <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold ${walletStatus.google ? 'bg-emerald-100 text-emerald-700' : 'bg-red-100 text-red-600'}`}>
                    Google {walletStatus.google ? '✓' : '✕'}
                  </span>
                </div>
              </div>
              <p className="text-sm text-[#6B6867] mb-5">
                I visitatori potranno aggiungere il biglietto direttamente ad Apple Wallet o Google Wallet dalla pagina di conferma.
              </p>

              {/* Google Wallet */}
              <div className="mb-5 p-4 bg-slate-50 rounded-xl border border-slate-200">
                <h4 className="font-semibold text-sm text-slate-900 mb-3 flex items-center gap-2">
                  <Smartphone className="w-4 h-4" /> Google Wallet
                </h4>
                <div className="grid gap-3">
                  <div>
                    <label className="block text-xs font-medium mb-1 text-slate-600">Issuer ID</label>
                    <input value={walletForm.google_wallet_issuer_id} onChange={e => setWalletForm({ ...walletForm, google_wallet_issuer_id: e.target.value })} placeholder="3388000000012345678" className="w-full px-3 py-2 border border-[#E5E1D9] rounded-lg focus:outline-none focus:ring-2 focus:ring-[#0F0E0C] text-sm" />
                  </div>
                  <div>
                    <label className="block text-xs font-medium mb-1 text-slate-600">Service Account Email</label>
                    <input type="email" value={walletForm.google_wallet_service_account_email} onChange={e => setWalletForm({ ...walletForm, google_wallet_service_account_email: e.target.value })} placeholder="wallet@project.iam.gserviceaccount.com" className="w-full px-3 py-2 border border-[#E5E1D9] rounded-lg focus:outline-none focus:ring-2 focus:ring-[#0F0E0C] text-sm" />
                  </div>
                  <div>
                    <label className="block text-xs font-medium mb-1 text-slate-600">Private Key (PEM)</label>
                    <textarea value={walletForm.google_wallet_private_key} onChange={e => setWalletForm({ ...walletForm, google_wallet_private_key: e.target.value })} placeholder="-----BEGIN PRIVATE KEY-----" rows={3} className="w-full px-3 py-2 border border-[#E5E1D9] rounded-lg focus:outline-none focus:ring-2 focus:ring-[#0F0E0C] text-sm font-mono text-xs resize-none" />
                  </div>
                </div>
              </div>

              {/* Apple Wallet */}
              <div className="mb-5 p-4 bg-slate-50 rounded-xl border border-slate-200">
                <h4 className="font-semibold text-sm text-slate-900 mb-3 flex items-center gap-2">
                  <Wallet className="w-4 h-4" /> Apple Wallet
                </h4>
                <div className="grid sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-medium mb-1 text-slate-600">Pass Type ID</label>
                    <input value={walletForm.apple_wallet_pass_type_id} onChange={e => setWalletForm({ ...walletForm, apple_wallet_pass_type_id: e.target.value })} placeholder="pass.com.qrgate.ticket" className="w-full px-3 py-2 border border-[#E5E1D9] rounded-lg focus:outline-none focus:ring-2 focus:ring-[#0F0E0C] text-sm" />
                  </div>
                  <div>
                    <label className="block text-xs font-medium mb-1 text-slate-600">Team ID</label>
                    <input value={walletForm.apple_wallet_team_id} onChange={e => setWalletForm({ ...walletForm, apple_wallet_team_id: e.target.value })} placeholder="ABC1234DEF" className="w-full px-3 py-2 border border-[#E5E1D9] rounded-lg focus:outline-none focus:ring-2 focus:ring-[#0F0E0C] text-sm" />
                  </div>
                </div>
                <div className="grid gap-3 mt-3">
                  <div>
                    <label className="block text-xs font-medium mb-1 text-slate-600">Certificate (PEM)</label>
                    <textarea value={walletForm.apple_wallet_certificate} onChange={e => setWalletForm({ ...walletForm, apple_wallet_certificate: e.target.value })} placeholder="-----BEGIN CERTIFICATE-----" rows={3} className="w-full px-3 py-2 border border-[#E5E1D9] rounded-lg focus:outline-none focus:ring-2 focus:ring-[#0F0E0C] text-sm font-mono text-xs resize-none" />
                  </div>
                  <div>
                    <label className="block text-xs font-medium mb-1 text-slate-600">Private Key (PEM)</label>
                    <textarea value={walletForm.apple_wallet_key} onChange={e => setWalletForm({ ...walletForm, apple_wallet_key: e.target.value })} placeholder="-----BEGIN RSA PRIVATE KEY-----" rows={3} className="w-full px-3 py-2 border border-[#E5E1D9] rounded-lg focus:outline-none focus:ring-2 focus:ring-[#0F0E0C] text-sm font-mono text-xs resize-none" />
                  </div>
                </div>
              </div>

              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2 text-xs text-slate-500">
                  <ShieldCheck className="w-4 h-4" /> Credenziali criptate server-side
                </div>
                <button type="button" onClick={handleSaveWallet} disabled={walletSaving} className="flex items-center gap-2 px-5 py-2 bg-slate-900 text-white rounded-xl font-bold text-sm hover:bg-slate-700 active:scale-95 transition-all disabled:opacity-50">
                  {walletSaving ? 'Salvataggio...' : 'Salva Wallet Config'}
                </button>
              </div>
            </div>

          </form>

          {/* Tools & Links */}
          <div className="grid sm:grid-cols-2 gap-4 mt-8 pt-8 border-t border-[#E5E1D9]">
            <div className="bg-[#F5F2EC] rounded-2xl border border-[#E5E1D9] p-5">
              <h3 className="font-semibold text-[#0F0F0F] mb-3 text-sm flex items-center gap-2">
                <QrCode className="w-4 h-4" /> Materiale Fisico
              </h3>
              <button
                onClick={downloadPoster}
                className="w-full flex items-center justify-center gap-2 py-2.5 bg-white border border-[#E5E1D9] text-[#0F0F0F] rounded-xl font-medium hover:bg-gray-50 transition-colors shadow-sm text-sm"
              >
                <Download className="w-4 h-4" /> Scarica Cartello PDF
              </button>
            </div>

            <div className="bg-[#F5F2EC] rounded-2xl border border-[#E5E1D9] p-5">
              <h3 className="font-semibold text-[#0F0F0F] mb-3 text-sm">Pulsante Sito Web</h3>
              <button
                onClick={() => {
                  navigator.clipboard.writeText(`<a href="${FRONTEND_URL}/${venue?.slug}" target="_blank" style="background:#1E3A5F;color:white;padding:12px 24px;border-radius:8px;text-decoration:none;font-family:sans-serif;font-weight:600">Acquista biglietto</a>`);
                  toast.success('Codice copiato');
                }}
                className="w-full flex items-center justify-center gap-2 py-2.5 bg-white border border-[#E5E1D9] text-[#0F0F0F] rounded-xl font-medium hover:bg-gray-50 transition-colors shadow-sm text-sm"
              >
                <Copy className="w-4 h-4" /> Copia HTML Codice
              </button>
            </div>
          </div>
        </div>

        {/* RIGHT COLUMN: LIVE PREVIEW (IKEA EFFECT) */}
        <div className="hidden lg:flex flex-col h-full bg-[var(--surface)] border border-[#E5E1D9] rounded-3xl overflow-hidden shadow-2xl relative">
          <div className="bg-[#F5F2EC] border-b border-[#E5E1D9] p-3 flex items-center justify-between z-10">
            <div className="flex gap-2">
              <div className="w-3 h-3 rounded-full bg-red-400"></div>
              <div className="w-3 h-3 rounded-full bg-amber-400"></div>
              <div className="w-3 h-3 rounded-full bg-green-400"></div>
            </div>
            <div className="bg-white/50 px-4 py-1.5 rounded-full text-xs font-mono text-[#6B6867] border border-[#E5E1D9] flex items-center gap-2">
              <ExternalLink className="w-3 h-3" />
              {FRONTEND_URL}/{venue?.slug}
            </div>
            <button
              onClick={copyLink}
              className="text-xs font-bold text-[#0F0E0C] hover:underline flex items-center gap-1"
            >
              {copied ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />} {copied ? 'Copiato' : 'Copia'}
            </button>
          </div>

          <div className="flex-1 bg-gray-100 relative">
            {saving && (
              <div className="absolute inset-0 bg-white/50 backdrop-blur-sm z-20 flex flex-col items-center justify-center">
                <div className="w-10 h-10 border-4 border-[#0F0E0C] border-t-transparent rounded-full animate-spin"></div>
                <p className="mt-4 font-bold text-[#0F0E0C] text-sm">Sincronizzazione modifiche...</p>
              </div>
            )}

            <iframe
              key={previewKey}
              src={`${FRONTEND_URL}/${venue?.slug}?preview=true`}
              className="w-full h-full border-none shadow-inner"
              title="Live Checkout Preview"
            />
          </div>
        </div>
      </div>
    </div>
  );
};

export default DashboardSettings;
