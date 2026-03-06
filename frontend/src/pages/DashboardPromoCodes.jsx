import React, { useEffect, useState, useCallback } from 'react';
import axios from 'axios';
import { Plus, Trash2, Tag, Percent, Euro } from 'lucide-react';
import { toast } from 'sonner';
import useConfirm from '@/hooks/useConfirm';

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;

const DashboardPromoCodes = () => {
  const [codes, setCodes] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({
    code: '', discount_type: 'percentage', discount_value: '',
    max_uses: '', valid_until: ''
  });

  const token = localStorage.getItem('qrgate_token');
  const headers = { Authorization: `Bearer ${token}` };

  const fetchCodes = useCallback(async () => {
    try {
      const res = await axios.get(`${BACKEND_URL}/api/dashboard/promo-codes`, { headers: { Authorization: `Bearer ${token}` } });
      setCodes(res.data);
    } catch (e) {
      toast.error('Errore caricamento codici');
    } finally {
      setLoading(false);
    }
  }, [token]);

  useEffect(() => { fetchCodes(); }, [fetchCodes]);

  const handleCreate = async (e) => {
    e.preventDefault();
    if (!form.code || !form.discount_value) return;
    try {
      const data = {
        code: form.code.toUpperCase(),
        discount_type: form.discount_type,
        discount_value: parseFloat(form.discount_value),
        max_uses: form.max_uses ? parseInt(form.max_uses) : null,
        valid_until: form.valid_until || null,
      };
      await axios.post(`${BACKEND_URL}/api/dashboard/promo-codes`, data, { headers });
      toast.success('Codice promo creato');
      setShowForm(false);
      setForm({ code: '', discount_type: 'percentage', discount_value: '', max_uses: '', valid_until: '' });
      fetchCodes();
    } catch (e) {
      toast.error(e.response?.data?.detail || 'Errore');
    }
  };

  const handleDelete = async (id) => {
    const ok = await confirm('Eliminare questo codice promo?', { confirmLabel: 'Elimina', danger: true });
    if (!ok) return;
    try {
      await axios.delete(`${BACKEND_URL}/api/dashboard/promo-codes/${id}`, { headers });
      toast.success('Codice eliminato');
      fetchCodes();
    } catch (e) {
      toast.error('Errore');
    }
  };

  return (
    <div data-testid="promo-codes-page">
      <div className="flex justify-between items-center mb-8">
        <div>
          <h2 className="text-[#0F0F0F]">Codici Promo</h2>
          <p className="text-[#6B6867] mt-1">Crea codici sconto per i tuoi visitatori</p>
        </div>
        <button onClick={() => setShowForm(true)} data-testid="add-promo-btn"
          className="flex items-center gap-2 px-4 py-2 bg-[#0F0E0C] text-white rounded-xl font-semibold hover:bg-[#292524] transition-all">
          <Plus className="w-4 h-4" /> Nuovo codice
        </button>
      </div>

      {showForm && (
        <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl p-6 w-full max-w-md shadow-elevated">
            <h3 className="font-bold text-[#0F0F0F] mb-4">Crea codice promo</h3>
            <form onSubmit={handleCreate} className="space-y-4">
              <div>
                <label className="block text-sm font-medium mb-1">Codice *</label>
                <input value={form.code} onChange={e => setForm({ ...form, code: e.target.value.toUpperCase() })} required
                  placeholder="es. ESTATE25" className="w-full px-4 py-2 border border-[#E5E1D9] rounded-xl focus:outline-none uppercase font-mono font-bold tracking-wider" />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">Tipo sconto</label>
                <div className="grid grid-cols-2 gap-2">
                  {[
                    { value: 'percentage', label: '% Percentuale', icon: <Percent className="w-4 h-4" /> },
                    { value: 'fixed', label: '€ Importo fisso', icon: <Euro className="w-4 h-4" /> },
                  ].map(opt => (
                    <label key={opt.value} onClick={() => setForm({ ...form, discount_type: opt.value })}
                      className={`flex items-center gap-2 p-3 border-2 rounded-xl cursor-pointer transition-all text-sm ${form.discount_type === opt.value ? 'border-[#0F0E0C] bg-blue-50 text-[#0F0E0C]' : 'border-[#E5E1D9]'}`}>
                      {opt.icon} {opt.label}
                    </label>
                  ))}
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">
                  Valore {form.discount_type === 'percentage' ? '(%)' : '(€)'} *
                </label>
                <input type="number" value={form.discount_value}
                  onChange={e => setForm({ ...form, discount_value: e.target.value })} required
                  min="1" max={form.discount_type === 'percentage' ? 100 : undefined} step={form.discount_type === 'percentage' ? 1 : 0.01}
                  placeholder={form.discount_type === 'percentage' ? 'es. 25' : 'es. 5.00'}
                  className="w-full px-4 py-2 border border-[#E5E1D9] rounded-xl focus:outline-none" />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-sm font-medium mb-1">Usi max (opz.)</label>
                  <input type="number" value={form.max_uses} onChange={e => setForm({ ...form, max_uses: e.target.value })}
                    min="1" placeholder="es. 100"
                    className="w-full px-4 py-2 border border-[#E5E1D9] rounded-xl focus:outline-none text-sm" />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1">Scade il (opz.)</label>
                  <input type="date" value={form.valid_until} onChange={e => setForm({ ...form, valid_until: e.target.value ? new Date(e.target.value).toISOString() : '' })}
                    className="w-full px-4 py-2 border border-[#E5E1D9] rounded-xl focus:outline-none text-sm" />
                </div>
              </div>
              <div className="flex gap-3">
                <button type="submit" data-testid="promo-save-btn"
                  className="flex-1 py-2 bg-[#0F0E0C] text-white rounded-xl font-semibold">
                  Crea codice
                </button>
                <button type="button" onClick={() => setShowForm(false)}
                  className="px-4 py-2 border border-[#E5E1D9] rounded-xl text-[#6B6867]">
                  Annulla
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
        <div className="p-8 bg-blue-900 rounded-[2.5rem] text-white relative overflow-hidden shadow-2xl">
          <div className="absolute top-0 right-0 -m-16 w-48 h-48 bg-blue-500/20 rounded-full blur-3xl"></div>
          <div className="relative z-10">
            <div className="w-12 h-12 bg-blue-600 rounded-2xl flex items-center justify-center mb-6">
              <Tag className="w-6 h-6" />
            </div>
            <h3 className="text-2xl font-black mb-2 uppercase tracking-tighter">Enterprise Promo Engine</h3>
            <p className="text-blue-300 text-sm leading-relaxed mb-6">Crea sconti dinamici per aumentare la conversione nei periodi di bassa affluenza.</p>
            <div className="flex gap-2">
              <span className="px-3 py-1 bg-white/10 rounded-full text-[10px] font-black uppercase tracking-widest border border-white/10">WELCOME10</span>
              <span className="px-3 py-1 bg-white/10 rounded-full text-[10px] font-black uppercase tracking-widest border border-white/10">EARLYBIRD</span>
            </div>
          </div>
        </div>

        <div className="p-8 bg-emerald-50 border-2 border-emerald-100 rounded-[2.5rem] flex flex-col justify-center">
          <h4 className="text-emerald-900 font-black text-lg mb-1 italic">Strategia Suggerita</h4>
          <p className="text-emerald-700 text-sm leading-relaxed">
            I codici <b className="text-emerald-900">EARLYBIRD</b> (15% di sconto prima delle 10:00) aumentano la distribuzione dei visitatori del <span className="text-emerald-900 font-black">22%</span>, riducendo le code al pomeriggio.
          </p>
        </div>
      </div>

      {loading ? (
        <div className="text-center py-12">Caricamento...</div>
      ) : codes.length === 0 ? (
        <div className="text-center py-16 bg-white rounded-[2.5rem] border-2 border-dashed border-slate-200">
          <Tag className="w-12 h-12 text-slate-200 mx-auto mb-4" />
          <p className="text-slate-400 font-bold uppercase tracking-widest text-xs mb-6">Nessun codice promo attivo</p>
          <button onClick={() => setShowForm(true)} className="px-8 py-4 bg-blue-600 text-white rounded-2xl font-black shadow-xl shadow-blue-100 hover:scale-105 transition-all">
            Crea il primo codice
          </button>
        </div>
      ) : (
        <div className="bg-white rounded-2xl border border-[#E5E1D9] overflow-hidden shadow-card">
          <table className="w-full text-sm">
            <thead className="bg-[#F5F2EC] border-b border-[#E5E1D9]">
              <tr>
                <th className="px-4 py-3 text-left font-semibold text-[#6B6867]">Codice</th>
                <th className="px-4 py-3 text-left font-semibold text-[#6B6867]">Sconto</th>
                <th className="px-4 py-3 text-left font-semibold text-[#6B6867]">Utilizzi</th>
                <th className="px-4 py-3 text-left font-semibold text-[#6B6867]">Scade</th>
                <th className="px-4 py-3 text-left font-semibold text-[#6B6867]">Azione</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#E5E1D9]">
              {codes.map(c => {
                const expired = c.valid_until && c.valid_until < new Date().toISOString();
                const exhausted = c.max_uses && c.current_uses >= c.max_uses;
                return (
                  <tr key={c.id} className={`hover:bg-[#F5F2EC] transition-colors ${(expired || exhausted) ? 'opacity-50' : ''}`}>
                    <td className="px-4 py-3">
                      <span className="font-mono font-bold text-[#0F0E0C] bg-blue-50 px-2 py-1 rounded-lg">{c.code}</span>
                    </td>
                    <td className="px-4 py-3 font-semibold text-[#0F0F0F]">
                      {c.discount_type === 'percentage' ? `${c.discount_value}%` : `€${c.discount_value.toFixed(2)}`}
                    </td>
                    <td className="px-4 py-3 text-[#6B6867]">
                      {c.current_uses}{c.max_uses ? ` / ${c.max_uses}` : ' / ∞'}
                    </td>
                    <td className="px-4 py-3 text-[#6B6867]">
                      {c.valid_until ? c.valid_until.slice(0, 10) : '—'}
                      {expired && <span className="ml-2 text-xs text-red-500">Scaduto</span>}
                    </td>
                    <td className="px-4 py-3">
                      <button onClick={() => handleDelete(c.id)} className="flex items-center gap-1 text-xs text-red-600 hover:text-red-700">
                        <Trash2 className="w-3 h-3" /> Elimina
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
};

export default DashboardPromoCodes;
