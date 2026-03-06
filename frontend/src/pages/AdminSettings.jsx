import React, { useEffect, useState } from 'react';
import axios from 'axios';
import { Save, AlertTriangle, Percent, Globe, CreditCard, CheckCircle2, XCircle, Eye, EyeOff, ExternalLink, ShieldCheck } from 'lucide-react';
import { toast } from 'sonner';

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;

const AdminSettings = () => {
  const [settings, setSettings] = useState(null);
  const [form, setForm] = useState({});
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [stripeConfig, setStripeConfig] = useState(null);
  const [stripeForm, setStripeForm] = useState({});
  const [savingStripe, setSavingStripe] = useState(false);
  const [showKeys, setShowKeys] = useState({});
  const token = localStorage.getItem('qrgate_token');
  const headers = { Authorization: `Bearer ${token}` };

  useEffect(() => {
    Promise.all([
      axios.get(`${BACKEND_URL}/api/admin/platform-settings`, { headers }),
      axios.get(`${BACKEND_URL}/api/admin/stripe-config`, { headers })
    ]).then(([settingsRes, stripeRes]) => {
      setSettings(settingsRes.data);
      setForm({
        fee_fixed_cents: settingsRes.data.fee_fixed_cents ?? 49,
        fee_percentage: settingsRes.data.fee_percentage ?? 5.0,
        platform_name: settingsRes.data.platform_name ?? 'QRGate',
        support_email: settingsRes.data.support_email ?? 'support@qrgate.com',
        from_email: settingsRes.data.from_email ?? 'onboarding@resend.dev',
        maintenance_mode: settingsRes.data.maintenance_mode ?? false,
        stripe_webhook_secret: settingsRes.data.stripe_webhook_secret ?? '',
      });
      setStripeConfig(stripeRes.data);
    }).catch(() => toast.error('Errore caricamento'))
      .finally(() => setLoading(false));
  }, []);

  const handleSave = async (e) => {
    if (e) e.preventDefault();
    setSaving(true);
    try {
      const res = await axios.put(`${BACKEND_URL}/api/admin/platform-settings`, form, { headers });
      setSettings(res.data);
      toast.success('Impostazioni piattaforma salvate');
    } catch (e) {
      toast.error(e.response?.data?.detail || 'Errore salvataggio');
    } finally { setSaving(false); }
  };

  const handleSaveStripe = async (e) => {
    e.preventDefault();
    setSavingStripe(true);
    try {
      await axios.put(`${BACKEND_URL}/api/admin/stripe-config`, stripeForm, { headers });
      const res = await axios.get(`${BACKEND_URL}/api/admin/stripe-config`, { headers });
      setStripeConfig(res.data);
      setStripeForm({});
      toast.success('Configurazione Stripe aggiornata');
    } catch (e) {
      toast.error(e.response?.data?.detail || 'Errore salvataggio Stripe');
    } finally { setSavingStripe(false); }
  };

  if (loading) return <div className="text-center py-20 font-black text-stone-400 animate-pulse">CARICAMENTO...</div>;

  const currentFeeExample = 1000;
  const feeFixed = form.fee_fixed_cents || 49;
  const feePct = form.fee_percentage || 5;
  const exampleFee = feeFixed + Math.round(currentFeeExample * feePct / 100);

  const Check = ({ ok }) => ok
    ? <CheckCircle2 className="w-4 h-4 text-emerald-500 flex-shrink-0" />
    : <XCircle className="w-4 h-4 text-red-500 flex-shrink-0" />;

  return (
    <div className="max-w-4xl mx-auto" data-testid="admin-settings">
      <div className="mb-12">
        <h2 className="text-4xl font-black text-stone-950 tracking-tight">Impostazioni</h2>
        <p className="text-stone-500 font-medium mt-2">Gestione globale dell'ecosistema QRGate</p>
      </div>

      <div className="space-y-10">
        {/* =============== STRIPE CONFIG SECTION =============== */}
        {stripeConfig && (
          <section className="bg-white rounded-[2.5rem] border border-stone-200 p-8 md:p-10 shadow-sm transition-all hover:shadow-md">
            <div className="flex items-center justify-between mb-10">
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 bg-stone-950 rounded-2xl flex items-center justify-center">
                  <CreditCard className="w-6 h-6 text-white" />
                </div>
                <div>
                  <h3 className="text-lg font-black text-stone-950 uppercase tracking-tight">Stripe Infrastructure</h3>
                  <p className="text-xs font-bold text-stone-400 uppercase tracking-widest">Gateway di Pagamento</p>
                </div>
              </div>
              <span data-testid="stripe-mode-badge" className={`px-4 py-1.5 rounded-full text-[10px] font-black uppercase tracking-widest border transition-all ${stripeConfig.mode === 'live'
                  ? 'bg-emerald-50 text-emerald-700 border-emerald-100 shadow-sm shadow-emerald-500/10'
                  : stripeConfig.mode === 'test'
                    ? 'bg-amber-50 text-amber-700 border-amber-100 shadow-sm shadow-amber-500/10'
                    : 'bg-red-50 text-red-700 border-red-100 shadow-sm shadow-red-500/10'
                }`}>
                {stripeConfig.mode === 'live' ? '● LIVE PRODUCTION' : stripeConfig.mode === 'test' ? '● TEST MODE' : 'NON CONFIGURATO'}
              </span>
            </div>

            <div className="grid sm:grid-cols-2 gap-6 mb-10">
              <div className="p-6 rounded-3xl bg-stone-50/50 border border-stone-100 transition-colors hover:bg-stone-50">
                <p className="text-[10px] font-black text-stone-400 uppercase tracking-widest mb-2">Secret Key</p>
                <p className="font-mono text-sm font-bold text-stone-600 truncate">{stripeConfig.secret_key_masked || 'NON IMPOSTATA'}</p>
              </div>
              <div className="p-6 rounded-3xl bg-stone-50/50 border border-stone-100 transition-colors hover:bg-stone-50">
                <p className="text-[10px] font-black text-stone-400 uppercase tracking-widest mb-2">Publishable Key</p>
                <p className="font-mono text-sm font-bold text-stone-600 truncate">{stripeConfig.publishable_key_masked || 'NON IMPOSTATA'}</p>
              </div>
            </div>

            <div className="p-8 rounded-[2rem] bg-stone-50/30 border border-stone-100 mb-10">
              <p className="text-xs font-black text-stone-900 uppercase tracking-[0.2em] mb-6 flex items-center gap-2">
                <ShieldCheck className="w-4 h-4" /> Production Readiness
              </p>
              <div className="grid sm:grid-cols-2 gap-4 text-xs">
                <div className="flex items-center gap-3 font-bold text-stone-600 bg-white p-3 rounded-2xl border border-stone-50 shadow-sm"><Check ok={stripeConfig.checklist.secret_key} /> Secret Key</div>
                <div className="flex items-center gap-3 font-bold text-stone-600 bg-white p-3 rounded-2xl border border-stone-50 shadow-sm"><Check ok={stripeConfig.checklist.publishable_key} /> Publishable Key</div>
                <div className="flex items-center gap-3 font-bold text-stone-600 bg-white p-3 rounded-2xl border border-stone-50 shadow-sm"><Check ok={stripeConfig.checklist.webhook_secret} /> Webhook Secret</div>
                <div className="flex items-center gap-3 font-bold text-stone-600 bg-white p-3 rounded-2xl border border-stone-50 shadow-sm"><Check ok={stripeConfig.checklist.live_mode} /> Live Mode</div>
              </div>
            </div>

            <form onSubmit={handleSaveStripe} className="space-y-6">
              <div className="grid grid-cols-1 gap-6">
                <div className="space-y-2">
                  <label className="text-[10px] font-black text-stone-400 uppercase tracking-widest px-1">Update Secret Key</label>
                  <div className="relative">
                    <input
                      type={showKeys.secret ? 'text' : 'password'}
                      data-testid="stripe-secret-key-input"
                      value={stripeForm.stripe_secret_key || ''}
                      onChange={e => setStripeForm({ ...stripeForm, stripe_secret_key: e.target.value })}
                      placeholder="sk_live_..."
                      className="w-full px-6 py-4 bg-stone-50 border border-stone-200 rounded-2xl focus:outline-none focus:ring-2 focus:ring-amber-600/20 font-mono text-sm transition-all"
                    />
                    <button type="button" onClick={() => setShowKeys({ ...showKeys, secret: !showKeys.secret })}
                      className="absolute right-4 top-1/2 -translate-y-1/2 text-stone-400 hover:text-stone-900 transition-colors">
                      {showKeys.secret ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                    </button>
                  </div>
                </div>

                <div className="space-y-2">
                  <label className="text-[10px] font-black text-stone-400 uppercase tracking-widest px-1">Update Publishable Key</label>
                  <input
                    type="text"
                    data-testid="stripe-publishable-key-input"
                    value={stripeForm.stripe_publishable_key || ''}
                    onChange={e => setStripeForm({ ...stripeForm, stripe_publishable_key: e.target.value })}
                    placeholder="pk_live_..."
                    className="w-full px-6 py-4 bg-stone-50 border border-stone-200 rounded-2xl focus:outline-none focus:ring-2 focus:ring-amber-600/20 font-mono text-sm transition-all"
                  />
                </div>

                <div className="space-y-2">
                  <label className="text-[10px] font-black text-stone-400 uppercase tracking-widest px-1">Update Webhook Secret</label>
                  <div className="relative">
                    <input
                      type={showKeys.webhook ? 'text' : 'password'}
                      data-testid="stripe-webhook-secret-input"
                      value={stripeForm.stripe_webhook_secret || ''}
                      onChange={e => setStripeForm({ ...stripeForm, stripe_webhook_secret: e.target.value })}
                      placeholder="whsec_..."
                      className="w-full px-6 py-4 bg-stone-50 border border-stone-200 rounded-2xl focus:outline-none focus:ring-2 focus:ring-amber-600/20 font-mono text-sm transition-all"
                    />
                    <button type="button" onClick={() => setShowKeys({ ...showKeys, webhook: !showKeys.webhook })}
                      className="absolute right-4 top-1/2 -translate-y-1/2 text-stone-400 hover:text-stone-900 transition-colors">
                      {showKeys.webhook ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                    </button>
                  </div>
                </div>
              </div>

              <div className="pt-4">
                <button type="submit" disabled={savingStripe || !Object.keys(stripeForm).some(k => stripeForm[k])}
                  data-testid="save-stripe-config-btn"
                  className="w-full sm:w-auto px-10 py-4 bg-stone-950 text-white rounded-2xl font-black text-xs uppercase tracking-widest shadow-xl shadow-stone-950/20 hover:bg-stone-800 transition-all disabled:opacity-30 active:scale-[0.98]">
                  {savingStripe ? 'SINCRONIZZAZIONE...' : 'AGGIORNA INFRASTRUTTURA STRIPE'}
                </button>
              </div>
            </form>
          </section>
        )}

        {/* =============== PLATFORM SETTINGS FORM =============== */}
        <section className="bg-white rounded-[2.5rem] border border-stone-200 p-8 md:p-10 shadow-sm transition-all hover:shadow-md">
          <div className="flex items-center gap-4 mb-10">
            <div className="w-12 h-12 bg-amber-600 rounded-2xl flex items-center justify-center shadow-lg shadow-amber-600/20">
              <Percent className="w-6 h-6 text-white" />
            </div>
            <div>
              <h3 className="text-lg font-black text-stone-950 uppercase tracking-tight">Financial & Platform Rules</h3>
              <p className="text-xs font-bold text-stone-400 uppercase tracking-widest">Commissioni e parametri globali</p>
            </div>
          </div>

          <form onSubmit={handleSave} className="space-y-10">
            <div className="grid sm:grid-cols-2 gap-8">
              <div className="space-y-2">
                <label className="text-[10px] font-black text-stone-400 uppercase tracking-widest px-1">Fixed Fee (Centestimi)</label>
                <input type="number" value={form.fee_fixed_cents}
                  onChange={e => setForm({ ...form, fee_fixed_cents: parseInt(e.target.value) })}
                  className="w-full px-6 py-4 bg-stone-50 border border-stone-200 rounded-2xl focus:outline-none focus:ring-2 focus:ring-amber-600/20 font-black tabular-nums transition-all" />
                <p className="px-1 text-[10px] font-bold text-stone-400 uppercase tracking-wider">€{((form.fee_fixed_cents || 0) / 100).toFixed(2)} per transazione</p>
              </div>
              <div className="space-y-2">
                <label className="text-[10px] font-black text-stone-400 uppercase tracking-widest px-1">Percentage Fee (%)</label>
                <input type="number" value={form.fee_percentage} step="0.1"
                  onChange={e => setForm({ ...form, fee_percentage: parseFloat(e.target.value) })}
                  className="w-full px-6 py-4 bg-stone-50 border border-stone-200 rounded-2xl focus:outline-none focus:ring-2 focus:ring-amber-600/20 font-black tabular-nums transition-all" />
                <p className="px-1 text-[10px] font-bold text-stone-400 uppercase tracking-wider">{form.fee_percentage}% sul transato</p>
              </div>
            </div>

            <div className="p-6 bg-stone-950 rounded-3xl shadow-xl shadow-stone-950/10">
              <p className="text-xs font-bold text-stone-400 uppercase tracking-widest mb-3">Simulazione Commissione</p>
              <div className="flex items-baseline gap-2">
                <span className="text-stone-500 text-sm">Su €{(currentFeeExample / 100).toFixed(2)}:</span>
                <span className="text-2xl font-black text-amber-500 tracking-tighter">€{(exampleFee / 100).toFixed(2)}</span>
                <span className="text-stone-500 text-[10px] font-black uppercase tracking-widest ml-auto">Revenue QRGate</span>
              </div>
            </div>

            <div className="space-y-8 pt-6 border-t border-stone-100">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                <div className="space-y-2">
                  <label className="text-[10px] font-black text-stone-400 uppercase tracking-widest px-1">Nome Piattaforma</label>
                  <input value={form.platform_name} onChange={e => setForm({ ...form, platform_name: e.target.value })}
                    className="w-full px-6 py-4 bg-stone-50 border border-stone-200 rounded-2xl focus:outline-none focus:ring-2 focus:ring-amber-600/20 font-bold transition-all" />
                </div>
                <div className="space-y-2">
                  <label className="text-[10px] font-black text-stone-400 uppercase tracking-widest px-1">Email Supporto</label>
                  <input type="email" value={form.support_email} onChange={e => setForm({ ...form, support_email: e.target.value })}
                    className="w-full px-6 py-4 bg-stone-50 border border-stone-200 rounded-2xl focus:outline-none focus:ring-2 focus:ring-amber-600/20 font-bold transition-all" />
                </div>
              </div>

              <div className="space-y-2">
                <label className="text-[10px] font-black text-stone-400 uppercase tracking-widest px-1">Email Mittente (Transactional)</label>
                <input type="email" value={form.from_email} onChange={e => setForm({ ...form, from_email: e.target.value })}
                  className="w-full px-6 py-4 bg-stone-50 border border-stone-200 rounded-2xl focus:outline-none focus:ring-2 focus:ring-amber-600/20 font-bold transition-all" />
              </div>
            </div>

            <div className="p-8 rounded-[2.5rem] border-2 border-dashed border-stone-200 bg-stone-50 overflow-hidden relative group">
              <div className="flex items-center justify-between relative z-10">
                <div>
                  <h4 className="text-sm font-black text-stone-950 uppercase tracking-widest mb-1">Maintenance Mode</h4>
                  <p className="text-xs font-bold text-stone-400">Disabilita istantaneamente tutti i checkout pubblici</p>
                </div>
                <label className="relative inline-flex items-center cursor-pointer scale-125">
                  <input type="checkbox" checked={form.maintenance_mode}
                    onChange={e => setForm({ ...form, maintenance_mode: e.target.checked })} className="sr-only peer" />
                  <div className="w-11 h-6 bg-stone-300 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-red-600"></div>
                </label>
              </div>
              {form.maintenance_mode && (
                <div className="mt-6 flex items-center gap-3 p-4 bg-red-600 text-white rounded-2xl animate-pulse">
                  <AlertTriangle className="w-5 h-5 flex-shrink-0" />
                  <span className="text-[10px] font-black uppercase tracking-widest">E-COMMERCE DISABILITATO — AZIONE CRITICA</span>
                </div>
              )}
            </div>

            <div className="pt-6">
              <button type="submit" disabled={saving} data-testid="save-platform-settings-btn"
                className="w-full sm:w-auto px-12 py-5 bg-stone-950 text-white rounded-2xl font-black text-xs uppercase tracking-[0.2em] shadow-2xl shadow-stone-950/30 hover:bg-stone-800 transition-all disabled:opacity-30 active:scale-[0.98]">
                {saving ? 'SALVATAGGIO...' : 'SALVA CONFIGURAZIONE GLOBALE'}
              </button>
            </div>
          </form>
        </section>
      </div>
    </div>
  );
};

export default AdminSettings;
