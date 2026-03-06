import React, { useEffect, useState, useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import axios from 'axios';
import { Plus, Pencil, Trash2, CreditCard, Users, Calendar, Infinity, X } from 'lucide-react';
import { toast } from 'sonner';
import useConfirm from '@/hooks/useConfirm';

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;

const DashboardSeasonPasses = () => {
  const { t } = useTranslation();
  const [passes, setPasses] = useState([]);
  const [holders, setHolders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editing, setEditing] = useState(null);
  const [activeTab, setActiveTab] = useState('passes');
  const [form, setForm] = useState({
    name: '',
    description: '',
    price: '',
    visits_allowed: -1,
    valid_days: 365,
    ticket_types: []
  });

  const token = localStorage.getItem('qrgate_token');
  const headers = { Authorization: `Bearer ${token}` };

  const fetchData = useCallback(async () => {
    try {
      const [passesRes, holdersRes] = await Promise.all([
        axios.get(`${BACKEND_URL}/api/dashboard/season-passes`, { headers: { Authorization: `Bearer ${token}` } }),
        axios.get(`${BACKEND_URL}/api/dashboard/season-pass-holders`, { headers: { Authorization: `Bearer ${token}` } })
      ]);
      setPasses(passesRes.data);
      setHolders(holdersRes.data);
    } catch (e) {
      toast.error('Errore caricamento abbonamenti');
    } finally {
      setLoading(false);
    }
  }, [token]);

  useEffect(() => { fetchData(); }, [fetchData]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!form.name || !form.price) return;

    try {
      const data = {
        ...form,
        price: Math.round(parseFloat(form.price) * 100),
        visits_allowed: parseInt(form.visits_allowed),
        valid_days: parseInt(form.valid_days)
      };

      if (editing) {
        await axios.put(`${BACKEND_URL}/api/dashboard/season-passes/${editing}`, data, { headers });
        toast.success('Abbonamento aggiornato');
      } else {
        await axios.post(`${BACKEND_URL}/api/dashboard/season-passes`, data, { headers });
        toast.success('Abbonamento creato');
      }

      setShowForm(false);
      setEditing(null);
      resetForm();
      fetchData();
    } catch (e) {
      toast.error(e.response?.data?.detail || 'Errore');
    }
  };

  const resetForm = () => {
    setForm({
      name: '',
      description: '',
      price: '',
      visits_allowed: -1,
      valid_days: 365,
      ticket_types: []
    });
  };

  const handleEdit = (pass) => {
    setForm({
      name: pass.name,
      description: pass.description || '',
      price: (pass.price / 100).toFixed(2),
      visits_allowed: pass.visits_allowed,
      valid_days: pass.valid_days,
      ticket_types: pass.ticket_types || []
    });
    setEditing(pass.id);
    setShowForm(true);
  };

  const handleDelete = async (id) => {
    const ok = await confirm('Disattivare questo abbonamento?', { confirmLabel: 'Disattiva', danger: true });
    if (!ok) return;
    try {
      await axios.delete(`${BACKEND_URL}/api/dashboard/season-passes/${id}`, { headers });
      toast.success('Abbonamento disattivato');
      fetchData();
    } catch (e) {
      toast.error('Errore');
    }
  };

  const formatDate = (dateStr) => {
    if (!dateStr) return '-';
    return new Date(dateStr).toLocaleDateString('it-IT');
  };

  return (
    <div data-testid="season-passes-page">
      <div className="flex flex-wrap justify-between items-center gap-4 mb-8">
        <div>
          <h2 className="text-[#0F0F0F]">
            <CreditCard className="w-5 h-5 inline mr-2" />
            Abbonamenti Stagionali
          </h2>
          <p className="text-[#6B6867] mt-1">Crea abbonamenti multi-ingresso per i tuoi visitatori</p>
        </div>
        <button
          onClick={() => { setShowForm(true); setEditing(null); resetForm(); }}
          className="flex items-center gap-2 px-4 py-2 bg-[#0F0E0C] text-white rounded-xl font-semibold hover:bg-[#292524] transition-all"
        >
          <Plus className="w-4 h-4" /> Nuovo Abbonamento
        </button>
      </div>

      {/* Tabs */}
      <div className="flex gap-2 mb-6">
        <button
          onClick={() => setActiveTab('passes')}
          className={`px-4 py-2 rounded-lg font-medium transition-colors ${activeTab === 'passes'
              ? 'bg-[#0F0E0C] text-white'
              : 'bg-white border border-[#E5E1D9] text-[#6B6867] hover:bg-gray-50'
            }`}
        >
          Abbonamenti ({passes.filter(p => p.active).length})
        </button>
        <button
          onClick={() => setActiveTab('holders')}
          className={`px-4 py-2 rounded-lg font-medium transition-colors ${activeTab === 'holders'
              ? 'bg-[#0F0E0C] text-white'
              : 'bg-white border border-[#E5E1D9] text-[#6B6867] hover:bg-gray-50'
            }`}
        >
          Abbonati ({holders.length})
        </button>
      </div>

      {/* Form Modal */}
      {showForm && (
        <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl p-6 w-full max-w-lg shadow-elevated">
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-bold text-[#0F0F0F]">
                {editing ? 'Modifica abbonamento' : 'Nuovo abbonamento'}
              </h3>
              <button onClick={() => setShowForm(false)} className="p-2 hover:bg-gray-100 rounded-lg">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-sm font-medium mb-1">Nome abbonamento *</label>
                <input
                  value={form.name}
                  onChange={e => setForm({ ...form, name: e.target.value })}
                  required
                  placeholder="es. Abbonamento Annuale"
                  className="w-full px-4 py-2 border border-[#E5E1D9] rounded-xl focus:outline-none focus:ring-2 focus:ring-[#0F0E0C]"
                />
              </div>

              <div>
                <label className="block text-sm font-medium mb-1">Descrizione</label>
                <input
                  value={form.description}
                  onChange={e => setForm({ ...form, description: e.target.value })}
                  placeholder="es. Accesso illimitato per un anno"
                  className="w-full px-4 py-2 border border-[#E5E1D9] rounded-xl focus:outline-none focus:ring-2 focus:ring-[#0F0E0C]"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium mb-1">Prezzo (€) *</label>
                  <input
                    type="number"
                    step="0.01"
                    min="0"
                    value={form.price}
                    onChange={e => setForm({ ...form, price: e.target.value })}
                    required
                    placeholder="50.00"
                    className="w-full px-4 py-2 border border-[#E5E1D9] rounded-xl focus:outline-none focus:ring-2 focus:ring-[#0F0E0C]"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1">Validità (giorni)</label>
                  <select
                    value={form.valid_days}
                    onChange={e => setForm({ ...form, valid_days: parseInt(e.target.value) })}
                    className="w-full px-4 py-2 border border-[#E5E1D9] rounded-xl focus:outline-none focus:ring-2 focus:ring-[#0F0E0C]"
                  >
                    <option value={30}>30 giorni</option>
                    <option value={90}>90 giorni</option>
                    <option value={180}>6 mesi</option>
                    <option value={365}>1 anno</option>
                    <option value={730}>2 anni</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium mb-1">Numero ingressi</label>
                <select
                  value={form.visits_allowed}
                  onChange={e => setForm({ ...form, visits_allowed: parseInt(e.target.value) })}
                  className="w-full px-4 py-2 border border-[#E5E1D9] rounded-xl focus:outline-none focus:ring-2 focus:ring-[#0F0E0C]"
                >
                  <option value={-1}>Illimitati</option>
                  <option value={5}>5 ingressi</option>
                  <option value={10}>10 ingressi</option>
                  <option value={20}>20 ingressi</option>
                  <option value={50}>50 ingressi</option>
                </select>
              </div>

              <div className="flex gap-3 pt-2">
                <button
                  type="submit"
                  className="flex-1 py-2 bg-[#0F0E0C] text-white rounded-xl font-semibold hover:bg-[#292524]"
                >
                  {editing ? 'Salva modifiche' : 'Crea abbonamento'}
                </button>
                <button
                  type="button"
                  onClick={() => setShowForm(false)}
                  className="px-4 py-2 border border-[#E5E1D9] rounded-xl text-[#6B6867]"
                >
                  Annulla
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Content */}
      {loading ? (
        <div className="text-center py-12 text-[#6B6867]">Caricamento...</div>
      ) : activeTab === 'passes' ? (
        passes.filter(p => p.active).length === 0 ? (
          <div className="text-center py-16 bg-white rounded-2xl border border-[#E5E1D9]">
            <CreditCard className="w-12 h-12 text-[#6B6867] mx-auto mb-4" />
            <p className="text-[#6B6867] mb-4">Nessun abbonamento creato</p>
            <button
              onClick={() => setShowForm(true)}
              className="px-4 py-2 bg-[#0F0E0C] text-white rounded-xl font-semibold"
            >
              Crea il primo abbonamento
            </button>
          </div>
        ) : (
          <div className="grid gap-4">
            {passes.filter(p => p.active).map(pass => (
              <div
                key={pass.id}
                className="bg-white border border-[#E5E1D9] rounded-2xl p-6 shadow-card"
              >
                <div className="flex items-center justify-between">
                  <div>
                    <div className="flex items-center gap-2 mb-1">
                      <h3 className="font-semibold text-[#0F0F0F]">{pass.name}</h3>
                      <span className="px-2 py-0.5 text-xs bg-purple-50 text-purple-600 rounded-full flex items-center gap-1">
                        {pass.visits_allowed === -1 ? (
                          <><Infinity className="w-3 h-3" /> Illimitato</>
                        ) : (
                          <><Users className="w-3 h-3" /> {pass.visits_allowed} ingressi</>
                        )}
                      </span>
                      <span className="px-2 py-0.5 text-xs bg-blue-50 text-blue-600 rounded-full flex items-center gap-1">
                        <Calendar className="w-3 h-3" /> {pass.valid_days} giorni
                      </span>
                    </div>
                    {pass.description && (
                      <p className="text-sm text-[#6B6867]">{pass.description}</p>
                    )}
                  </div>
                  <div className="flex items-center gap-4">
                    <span className="text-2xl font-bold text-[#0F0F0F]">
                      €{(pass.price / 100).toFixed(2)}
                    </span>
                    <div className="flex gap-2">
                      <button
                        onClick={() => handleEdit(pass)}
                        className="p-2 hover:bg-[#F5F2EC] rounded-lg transition-colors"
                      >
                        <Pencil className="w-4 h-4 text-[#6B6867]" />
                      </button>
                      <button
                        onClick={() => handleDelete(pass.id)}
                        className="p-2 hover:bg-red-50 rounded-lg transition-colors"
                      >
                        <Trash2 className="w-4 h-4 text-red-500" />
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )
      ) : (
        holders.length === 0 ? (
          <div className="text-center py-16 bg-white rounded-2xl border border-[#E5E1D9]">
            <Users className="w-12 h-12 text-[#6B6867] mx-auto mb-4" />
            <p className="text-[#6B6867]">Nessun abbonato ancora</p>
          </div>
        ) : (
          <div className="bg-white border border-[#E5E1D9] rounded-xl overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-gray-50 border-b border-[#E5E1D9]">
                  <tr>
                    <th className="px-4 py-3 text-left text-sm font-semibold text-[#6B6867]">Abbonato</th>
                    <th className="px-4 py-3 text-left text-sm font-semibold text-[#6B6867]">Abbonamento</th>
                    <th className="px-4 py-3 text-left text-sm font-semibold text-[#6B6867]">Codice</th>
                    <th className="px-4 py-3 text-left text-sm font-semibold text-[#6B6867]">Ingressi</th>
                    <th className="px-4 py-3 text-left text-sm font-semibold text-[#6B6867]">Scadenza</th>
                    <th className="px-4 py-3 text-left text-sm font-semibold text-[#6B6867]">Stato</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#E5E1D9]">
                  {holders.map((holder) => {
                    const isExpired = new Date(holder.expires_at) < new Date();
                    const isExhausted = holder.visits_allowed !== -1 && holder.visits_used >= holder.visits_allowed;

                    return (
                      <tr key={holder.id} className="hover:bg-gray-50">
                        <td className="px-4 py-3">
                          <div className="font-medium text-[#0F0F0F]">{holder.visitor_name}</div>
                          <div className="text-xs text-[#6B6867]">{holder.visitor_email}</div>
                        </td>
                        <td className="px-4 py-3 text-[#0F0F0F]">{holder.pass_name}</td>
                        <td className="px-4 py-3">
                          <code className="px-2 py-1 bg-gray-100 rounded text-sm">{holder.pass_code}</code>
                        </td>
                        <td className="px-4 py-3 text-[#0F0F0F]">
                          {holder.visits_allowed === -1 ? (
                            <span className="flex items-center gap-1">
                              <Infinity className="w-4 h-4" /> Illimitati ({holder.visits_used} usati)
                            </span>
                          ) : (
                            `${holder.visits_used} / ${holder.visits_allowed}`
                          )}
                        </td>
                        <td className="px-4 py-3 text-[#6B6867]">
                          {formatDate(holder.expires_at)}
                        </td>
                        <td className="px-4 py-3">
                          <span className={`px-2 py-1 rounded-full text-xs font-medium ${isExpired ? 'bg-red-100 text-red-700' :
                              isExhausted ? 'bg-amber-100 text-amber-700' :
                                'bg-green-100 text-green-700'
                            }`}>
                            {isExpired ? 'Scaduto' : isExhausted ? 'Esaurito' : 'Attivo'}
                          </span>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        )
      )}
    </div>
  );
};

export default DashboardSeasonPasses;
