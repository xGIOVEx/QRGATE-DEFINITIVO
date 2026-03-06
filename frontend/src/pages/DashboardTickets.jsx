import React, { useEffect, useState, useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import axios from 'axios';
import {
  Plus, Search, Pencil, Trash2, Clock, X, ChevronRight, ChevronDown,
  Calendar, Check, AlertCircle, FileText, Zap
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { toast } from 'sonner';
import useConfirm from '@/hooks/useConfirm';

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;

const DashboardTickets = () => {
  const { t } = useTranslation();
  const confirm = useConfirm();
  const [tickets, setTickets] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editing, setEditing] = useState(null);
  const [form, setForm] = useState({
    name: '',
    description: '',
    price: '',
    type: 'standard',
    timed_entry: false,
    slot_duration_minutes: 60,
    slots: [],
    dynamic_pricing: { enabled: false, threshold_pct: 20, max_increase_pct: 30 }
  });

  const venue = JSON.parse(localStorage.getItem('qrgate_venue') || '{}');
  const token = localStorage.getItem('qrgate_token');
  const headers = { Authorization: `Bearer ${token}` };

  const fetchTickets = useCallback(async () => {
    try {
      const res = await axios.get(`${BACKEND_URL}/api/dashboard/tickets`, { headers: { Authorization: `Bearer ${token}` } });
      setTickets(res.data);
    } catch (e) {
      toast.error('Errore caricamento biglietti');
    } finally {
      setLoading(false);
    }
  }, [token]);

  useEffect(() => { fetchTickets(); }, [fetchTickets]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!form.name || !form.price) return;
    try {
      const data = {
        ...form,
        price: Math.round(parseFloat(form.price) * 100),
        slots: form.timed_entry ? form.slots : [],
        dynamic_pricing: form.dynamic_pricing
      };

      const endpoint = form.timed_entry
        ? `${BACKEND_URL}/api/dashboard/tickets/timed`
        : `${BACKEND_URL}/api/dashboard/tickets`;

      if (editing) {
        await axios.put(`${BACKEND_URL}/api/dashboard/tickets/${editing}`, data, { headers });
        toast.success('Biglietto aggiornato');
      } else {
        await axios.post(endpoint, data, { headers });
        toast.success('Biglietto creato');
      }
      setShowForm(false);
      setEditing(null);
      resetForm();
      fetchTickets();
    } catch (e) {
      const errorMsg = e.response?.data?.detail;
      toast.error(typeof errorMsg === 'string' ? errorMsg : (JSON.stringify(errorMsg) || 'Errore'));
    }
  };

  const resetForm = () => {
    setForm({
      name: '',
      description: '',
      price: '',
      type: 'standard',
      timed_entry: false,
      slot_duration_minutes: 60,
      slots: [],
      dynamic_pricing: { enabled: false, threshold_pct: 20, max_increase_pct: 30 }
    });
  };

  const handleEdit = (ticket) => {
    setForm({
      name: ticket.name,
      description: ticket.description || '',
      price: (ticket.price / 100).toFixed(2),
      type: ticket.type,
      timed_entry: ticket.timed_entry || false,
      slot_duration_minutes: ticket.slot_duration_minutes || 60,
      slots: ticket.slots || [],
      dynamic_pricing: ticket.dynamic_pricing || { enabled: false, threshold_pct: 20, max_increase_pct: 30 }
    });
    setEditing(ticket.id);
    setShowForm(true);
  };

  const handleDelete = async (id) => {
    const ok = await confirm('Disattivare questo biglietto? Sarà nascosto dalla vetrina.', { confirmLabel: 'Disattiva', danger: true });
    if (!ok) return;
    try {
      await axios.delete(`${BACKEND_URL}/api/dashboard/tickets/${id}`, { headers });
      toast.success('Biglietto disattivato');
      fetchTickets();
    } catch (e) {
      toast.error('Errore');
    }
  };

  const addSlot = () => {
    setForm({
      ...form,
      slots: [...form.slots, { time: '10:00', capacity: 50, days_available: ['all'] }]
    });
  };

  const updateSlot = (index, field, value) => {
    const newSlots = [...form.slots];
    newSlots[index] = { ...newSlots[index], [field]: value };
    setForm({ ...form, slots: newSlots });
  };

  const removeSlot = (index) => {
    setForm({ ...form, slots: form.slots.filter((_, i) => i !== index) });
  };

  const defaultSlots = [
    { time: '09:00', capacity: 50 },
    { time: '10:00', capacity: 50 },
    { time: '11:00', capacity: 50 },
    { time: '12:00', capacity: 50 },
    { time: '14:00', capacity: 50 },
    { time: '15:00', capacity: 50 },
    { time: '16:00', capacity: 50 },
    { time: '17:00', capacity: 50 },
  ];

  const addDefaultSlots = () => {
    setForm({
      ...form,
      slots: defaultSlots.map(s => ({ ...s, days_available: ['all'] }))
    });
  };

  return (
    <div data-testid="tickets-page">
      <div className="flex justify-between items-center mb-8">
        <div>
          <h2 className="text-[#0F0F0F]">{t('dashboard.tickets')}</h2>
          <p className="text-[#6B6867] mt-1">Gestisci i tipi di biglietto per il tuo luogo</p>
        </div>
        <button onClick={() => { setShowForm(true); setEditing(null); resetForm(); }}
          data-testid="add-ticket-btn"
          className="flex items-center gap-2 px-4 py-2 bg-[#0F0E0C] text-white rounded-xl font-semibold hover:bg-[#292524] transition-all">
          <Plus className="w-4 h-4" /> {t('dashboard.addTicket')}
        </button>
      </div>

      {showForm && (
        <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4 overflow-y-auto">
          <div className="bg-white rounded-2xl p-6 w-full max-w-lg shadow-elevated my-8">
            <h3 className="font-bold text-[#0F0F0F] mb-4">{editing ? 'Modifica biglietto' : 'Nuovo biglietto'}</h3>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-sm font-medium mb-1">Nome biglietto *</label>
                <input value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} required
                  placeholder="es. Biglietto Intero" data-testid="ticket-name-input"
                  className="w-full px-4 py-2 border border-[#E5E1D9] rounded-xl focus:outline-none focus:ring-2 focus:ring-[#0F0E0C]" />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">Descrizione</label>
                <input value={form.description} onChange={e => setForm({ ...form, description: e.target.value })}
                  placeholder="es. Ingresso standard"
                  className="w-full px-4 py-2 border border-[#E5E1D9] rounded-xl focus:outline-none focus:ring-2 focus:ring-[#0F0E0C]" />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium mb-1">Prezzo (€) *</label>
                  <input type="number" step="0.01" min="0" value={form.price} onChange={e => setForm({ ...form, price: e.target.value })} required
                    placeholder="8.00" data-testid="ticket-price-input"
                    className="w-full px-4 py-2 border border-[#E5E1D9] rounded-xl focus:outline-none focus:ring-2 focus:ring-[#0F0E0C]" />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1">Tipo</label>
                  <select value={form.type} onChange={e => setForm({ ...form, type: e.target.value })}
                    className="w-full px-4 py-2 border border-[#E5E1D9] rounded-xl focus:outline-none focus:ring-2 focus:ring-[#0F0E0C]">
                    <option value="standard">Standard</option>
                    <option value="reduced">Ridotto</option>
                    <option value="premium">Premium</option>
                    <option value="free">Gratuito</option>
                  </select>
                </div>
              </div>

              {/* Timed Entry Toggle */}
              <div className="border border-[#E5E1D9] rounded-xl p-4">
                <label className="flex items-center gap-3 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={form.timed_entry}
                    onChange={e => setForm({ ...form, timed_entry: e.target.checked })}
                    className="w-5 h-5 accent-[#0F0E0C]"
                  />
                  <div>
                    <span className="font-medium text-[#0F0F0F]">Biglietto a fascia oraria</span>
                    <p className="text-sm text-[#6B6867]">I visitatori scelgono data e ora</p>
                  </div>
                  <Clock className="w-5 h-5 text-blue-500 ml-auto" />
                </label>
              </div>

              {/* Slot Configuration */}
              {form.timed_entry && (
                <div className="space-y-4 p-4 bg-blue-50 rounded-xl">
                  <div className="flex items-center justify-between">
                    <label className="text-sm font-medium">Durata fascia</label>
                    <select
                      value={form.slot_duration_minutes}
                      onChange={e => setForm({ ...form, slot_duration_minutes: parseInt(e.target.value) })}
                      className="px-3 py-1 border border-[#E5E1D9] rounded-lg bg-white"
                    >
                      <option value={30}>30 minuti</option>
                      <option value={60}>1 ora</option>
                      <option value={90}>1h 30min</option>
                      <option value={120}>2 ore</option>
                    </select>
                  </div>

                  <div>
                    <div className="flex items-center justify-between mb-2">
                      <label className="text-sm font-medium">Fasce orarie</label>
                      <div className="flex gap-2">
                        <button type="button" onClick={addDefaultSlots} className="text-xs text-blue-600 hover:underline">
                          Fasce standard
                        </button>
                        <button type="button" onClick={addSlot} className="text-xs text-blue-600 hover:underline">
                          + Aggiungi
                        </button>
                      </div>
                    </div>

                    {form.slots.length === 0 ? (
                      <p className="text-sm text-[#6B6867] text-center py-4">
                        Nessuna fascia configurata. Clicca "Fasce standard" per iniziare.
                      </p>
                    ) : (
                      <div className="space-y-2 max-h-48 overflow-y-auto">
                        {form.slots.map((slot, index) => (
                          <div key={index} className="flex items-center gap-2 bg-white p-2 rounded-lg">
                            <input
                              type="time"
                              value={slot.time}
                              onChange={e => updateSlot(index, 'time', e.target.value)}
                              className="px-2 py-1 border border-[#E5E1D9] rounded-lg text-sm"
                            />
                            <input
                              type="number"
                              value={slot.capacity}
                              onChange={e => updateSlot(index, 'capacity', parseInt(e.target.value) || 0)}
                              min="1"
                              className="w-20 px-2 py-1 border border-[#E5E1D9] rounded-lg text-sm"
                              placeholder="Capacità"
                            />
                            <span className="text-xs text-[#6B6867]">posti</span>
                            <button type="button" onClick={() => removeSlot(index)}
                              className="p-1 text-red-500 hover:bg-red-50 rounded">
                              <X className="w-4 h-4" />
                            </button>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* ── Smart Pricing Dinamico ─────────────────────── */}
              <div className="border border-[#E5E1D9] rounded-xl p-4">
                <label className="flex items-center gap-3 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={form.dynamic_pricing?.enabled || false}
                    onChange={e => setForm({ ...form, dynamic_pricing: { ...form.dynamic_pricing, enabled: e.target.checked } })}
                    className="w-5 h-5 accent-amber-500"
                  />
                  <div>
                    <span className="font-medium text-[#0F0F0F] flex items-center gap-1.5">
                      <Zap className="w-4 h-4 text-amber-500" /> Smart Pricing
                    </span>
                    <p className="text-sm text-[#6B6867]">Il prezzo sale automaticamente con la domanda</p>
                  </div>
                </label>

                {form.dynamic_pricing?.enabled && (
                  <div className="mt-4 space-y-4 pl-8">
                    <div>
                      <div className="flex items-center justify-between mb-1">
                        <label className="text-sm font-medium text-[#0F0F0F]">Soglia attivazione</label>
                        <span className="text-sm font-bold text-amber-600 tabular-nums">{form.dynamic_pricing.threshold_pct}% rimasti</span>
                      </div>
                      <input type="range" min="5" max="40" step="5" value={form.dynamic_pricing.threshold_pct}
                        onChange={e => setForm({ ...form, dynamic_pricing: { ...form.dynamic_pricing, threshold_pct: parseInt(e.target.value) } })}
                        className="w-full accent-amber-500" />
                      <p className="text-xs text-[#6B6867] mt-1">Il prezzo sale quando restano meno del {form.dynamic_pricing.threshold_pct}% dei posti</p>
                    </div>
                    <div>
                      <div className="flex items-center justify-between mb-1">
                        <label className="text-sm font-medium text-[#0F0F0F]">Aumento massimo</label>
                        <span className="text-sm font-bold text-amber-600 tabular-nums">+{form.dynamic_pricing.max_increase_pct}%</span>
                      </div>
                      <input type="range" min="5" max="50" step="5" value={form.dynamic_pricing.max_increase_pct}
                        onChange={e => setForm({ ...form, dynamic_pricing: { ...form.dynamic_pricing, max_increase_pct: parseInt(e.target.value) } })}
                        className="w-full accent-amber-500" />
                    </div>
                    {form.price && (
                      <div className="bg-amber-50 border border-amber-200 rounded-lg p-3 text-sm">
                        <p className="font-medium text-amber-900">
                          Prezzo: <span className="tabular-nums">€{parseFloat(form.price).toFixed(2)}</span> → max <span className="tabular-nums font-bold">€{(parseFloat(form.price) * (1 + form.dynamic_pricing.max_increase_pct / 100)).toFixed(2)}</span>
                        </p>
                      </div>
                    )}
                  </div>
                )}
              </div>

              <div className="flex gap-3 pt-2">
                <button type="submit" data-testid="ticket-save-btn"
                  className="flex-1 py-2 bg-[#0F0E0C] text-white rounded-xl font-semibold hover:bg-[#292524]">
                  {editing ? 'Salva modifiche' : 'Crea biglietto'}
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

      {loading ? (
        <div className="grid gap-5">
          {[...Array(3)].map((_, i) => (
            <motion.div
              key={i}
              initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.1 }}
              className="glass-card p-6 flex flex-col justify-between relative overflow-hidden"
            >
              <div className="absolute inset-0 -translate-x-full animate-[shimmer_2s_infinite] bg-gradient-to-r from-transparent via-white/40 to-transparent" />
              <div className="flex items-center justify-between relative z-10 w-full">
                <div className="w-1/2">
                  <div className="h-7 w-48 bg-slate-200 rounded-xl mb-3 animate-pulse" />
                  <div className="h-4 w-full max-w-sm bg-slate-100 rounded-lg mb-2 animate-pulse" />
                  <div className="h-4 w-2/3 bg-slate-100 rounded-lg animate-pulse" />
                </div>
                <div className="flex flex-col items-end gap-3">
                  <div className="h-10 w-24 bg-slate-200 rounded-2xl animate-pulse" />
                  <div className="h-10 w-32 bg-slate-100 rounded-xl animate-pulse" />
                </div>
              </div>
            </motion.div>
          ))}
        </div>
      ) : tickets.length === 0 ? (
        <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} className="text-center py-20 glass-card">
          <FileText className="w-16 h-16 text-[#6B6867] mx-auto mb-4 opacity-20" />
          <p className="text-[#6B6867] mb-6 text-lg font-medium">Nessun biglietto configurato</p>
          <button onClick={() => setShowForm(true)} className="px-6 py-3 bg-gradient-to-r from-[#0F0E0C] to-blue-600 text-white rounded-xl font-bold border-0 shadow-[0_10px_20px_-10px_rgba(37,99,235,0.5)] hover:scale-[1.03] transition-all">
            Crea il primo biglietto
          </button>
        </motion.div>
      ) : (
        <div className="grid gap-5">
          <AnimatePresence>
            {tickets.map(ticket => (
              <motion.div
                key={ticket.id}
                layout
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.95 }}
                data-testid={`ticket-${ticket.id}`}
                className={`glass-card p-6 flex flex-col justify-between relative overflow-hidden group hover:scale-[1.01] transition-all duration-300 ${!ticket.active ? 'opacity-60 grayscale-[50%]' : ''}`}
              >
                <div className="absolute inset-0 bg-gradient-to-r from-blue-500/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />

                <div className="flex items-center justify-between relative z-10">
                  <div>
                    <div className="flex items-center gap-3 mb-2 flex-wrap">
                      <h3 className="font-extrabold text-xl text-slate-900 tracking-tight">{ticket.name}</h3>
                      <span className={`px-2.5 py-1 text-xs rounded-lg font-bold shadow-sm ${ticket.active ? 'bg-emerald-100/80 text-emerald-700 border border-emerald-200' : 'bg-red-100/80 text-red-700 border border-red-200'}`}>
                        {ticket.active ? 'Attivo' : 'Inattivo'}
                      </span>
                      <span className="px-2.5 py-1 text-xs bg-blue-100/80 text-blue-700 font-bold rounded-lg border border-blue-200 uppercase tracking-wider">{ticket.type}</span>
                      {ticket.timed_entry && (
                        <span className="px-2.5 py-1 text-xs bg-purple-100/80 text-purple-700 font-bold rounded-lg border border-purple-200 flex items-center gap-1">
                          <Clock className="w-3.5 h-3.5" /> Fasce Orarie
                        </span>
                      )}
                    </div>
                    {ticket.description && <p className="text-sm text-slate-500 font-medium max-w-2xl">{ticket.description}</p>}

                    {ticket.timed_entry && ticket.slots?.length > 0 && (
                      <div className="mt-3 inline-flex items-center gap-2 px-3 py-1.5 bg-slate-50 rounded-lg text-xs font-semibold text-slate-500 border border-slate-200/50">
                        <Calendar className="w-3.5 h-3.5" />
                        {ticket.slots.length} fasce attive • {ticket.slot_duration_minutes} min/fascia
                      </div>
                    )}
                  </div>

                  <div className="flex flex-col items-end gap-3">
                    <span className="text-3xl font-black text-slate-900 tracking-tight">€{(ticket.price / 100).toFixed(2)}</span>

                    <div className="flex items-center gap-2 bg-slate-50 p-1.5 rounded-xl border border-slate-200/60 relative z-20">
                      <a
                        href={`${BACKEND_URL}/api/dashboard/reports/poster?slug=${venue?.slug}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="p-2 bg-white hover:bg-emerald-50 text-slate-400 hover:text-emerald-600 rounded-lg transition-colors flex items-center gap-1.5 font-semibold text-sm shadow-sm border border-slate-200/50"
                        title="Scarica Poster HQ"
                      >
                        <FileText className="w-4 h-4" /> <span className="hidden sm:inline">Poster HQ</span>
                      </a>

                      <div className="w-px h-6 bg-slate-200 mx-1"></div>

                      <button onClick={() => handleEdit(ticket)} className="p-2 bg-white hover:bg-blue-50 text-slate-400 hover:text-blue-600 rounded-lg shadow-sm border border-slate-200/50 transition-colors" title="Modifica">
                        <Pencil className="w-4 h-4" />
                      </button>

                      <button onClick={() => handleDelete(ticket.id)} className="p-2 bg-white hover:bg-red-50 text-slate-400 hover:text-red-500 rounded-lg shadow-sm border border-slate-200/50 transition-colors" title="Disattiva">
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                </div>
              </motion.div>
            ))}
          </AnimatePresence>
        </div>
      )}
    </div>
  );
};

export default DashboardTickets;
