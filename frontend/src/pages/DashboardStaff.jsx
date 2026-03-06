import React, { useEffect, useState, useCallback } from 'react';
import axios from 'axios';
import { Plus, Trash2, User } from 'lucide-react';
import { toast } from 'sonner';
import useConfirm from '@/hooks/useConfirm';

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;

const DashboardStaff = () => {
  const [staff, setStaff] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({ email: '', password: '', role: 'scanner' });

  const token = localStorage.getItem('qrgate_token');
  const headers = { Authorization: `Bearer ${token}` };

  const fetchStaff = useCallback(async () => {
    try {
      const res = await axios.get(`${BACKEND_URL}/api/dashboard/staff`, { headers: { Authorization: `Bearer ${token}` } });
      setStaff(res.data);
    } catch (e) {
      toast.error('Errore caricamento staff');
    } finally {
      setLoading(false);
    }
  }, [token]);

  useEffect(() => { fetchStaff(); }, [fetchStaff]);

  const handleCreate = async (e) => {
    e.preventDefault();
    try {
      await axios.post(`${BACKEND_URL}/api/dashboard/staff`, form, { headers });
      toast.success('Staff aggiunto con successo');
      setShowForm(false);
      setForm({ email: '', password: '', role: 'scanner' });
      fetchStaff();
    } catch (e) {
      toast.error(e.response?.data?.detail || 'Errore');
    }
  };

  const handleDelete = async (id) => {
    const ok = await confirm('Rimuovere questo membro dallo staff?', { confirmLabel: 'Rimuovi', danger: true });
    if (!ok) return;
    try {
      await axios.delete(`${BACKEND_URL}/api/dashboard/staff/${id}`, { headers });
      toast.success('Staff rimosso');
      fetchStaff();
    } catch (e) {
      toast.error('Errore rimozione');
    }
  };

  return (
    <div data-testid="staff-page">
      <div className="flex justify-between items-center mb-8">
        <div>
          <h2 className="text-[#0F0F0F]">Staff</h2>
          <p className="text-[#6B6867] mt-1">Gestisci lo staff autorizzato allo scanner</p>
        </div>
        <button onClick={() => setShowForm(true)} data-testid="add-staff-btn"
          className="flex items-center gap-2 px-4 py-2 bg-[#0F0E0C] text-white rounded-xl font-semibold hover:bg-[#292524] transition-all">
          <Plus className="w-4 h-4" /> Aggiungi staff
        </button>
      </div>

      {showForm && (
        <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl p-6 w-full max-w-md shadow-elevated">
            <h3 className="font-bold text-[#0F0F0F] mb-4">Aggiungi membro staff</h3>
            <form onSubmit={handleCreate} className="space-y-4">
              <div>
                <label className="block text-sm font-medium mb-1">Email *</label>
                <input type="email" value={form.email} onChange={e => setForm({ ...form, email: e.target.value })} required
                  placeholder="staff@esempio.it" data-testid="staff-email-create"
                  className="w-full px-4 py-2 border border-[#E5E1D9] rounded-xl focus:outline-none focus:ring-2 focus:ring-[#0F0E0C]" />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">Password *</label>
                <input type="password" value={form.password} onChange={e => setForm({ ...form, password: e.target.value })} required
                  placeholder="min 8 caratteri" data-testid="staff-password-create"
                  className="w-full px-4 py-2 border border-[#E5E1D9] rounded-xl focus:outline-none focus:ring-2 focus:ring-[#0F0E0C]" />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">Ruolo</label>
                <select value={form.role} onChange={e => setForm({ ...form, role: e.target.value })}
                  className="w-full px-4 py-2 border border-[#E5E1D9] rounded-xl focus:outline-none">
                  <option value="scanner">Scanner (solo scansione)</option>
                  <option value="cashier">Cassa (vendita + scansione)</option>
                </select>
              </div>
              <div className="bg-blue-50 rounded-xl p-3 text-xs text-blue-700">
                Lo staff accede tramite l'app Scanner su <strong>/scanner</strong>
              </div>
              <div className="flex gap-3">
                <button type="submit" data-testid="staff-save-btn"
                  className="flex-1 py-2 bg-[#0F0E0C] text-white rounded-xl font-semibold">
                  Aggiungi
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
        <div className="text-center py-12">Caricamento...</div>
      ) : staff.length === 0 ? (
        <div className="text-center py-16 bg-white rounded-2xl border border-[#E5E1D9]">
          <User className="w-12 h-12 text-[#6B6867] mx-auto mb-3" />
          <p className="text-[#6B6867] mb-4">Nessun membro staff</p>
          <button onClick={() => setShowForm(true)} className="px-4 py-2 bg-[#0F0E0C] text-white rounded-xl">
            Aggiungi il primo
          </button>
        </div>
      ) : (
        <div className="bg-white rounded-2xl border border-[#E5E1D9] overflow-hidden shadow-card">
          <table className="w-full text-sm">
            <thead className="bg-[#F5F2EC] border-b border-[#E5E1D9]">
              <tr>
                <th className="px-6 py-3 text-left font-semibold text-[#6B6867]">Email</th>
                <th className="px-6 py-3 text-left font-semibold text-[#6B6867]">Ruolo</th>
                <th className="px-6 py-3 text-left font-semibold text-[#6B6867]">Data aggiunta</th>
                <th className="px-6 py-3 text-left font-semibold text-[#6B6867]">Azione</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#E5E1D9]">
              {staff.map(s => (
                <tr key={s.id} className="hover:bg-[#F5F2EC] transition-colors">
                  <td className="px-6 py-4 font-medium text-[#0F0F0F]">{s.email}</td>
                  <td className="px-6 py-4">
                    <span className="px-2 py-0.5 bg-blue-50 text-blue-700 text-xs font-medium rounded-full capitalize">{s.role}</span>
                  </td>
                  <td className="px-6 py-4 text-[#6B6867]">{s.created_at?.slice(0, 10)}</td>
                  <td className="px-6 py-4">
                    <button onClick={() => handleDelete(s.id)} data-testid={`remove-staff-${s.id}`}
                      className="flex items-center gap-1 text-xs text-red-600 hover:text-red-700 font-medium">
                      <Trash2 className="w-3 h-3" /> Rimuovi
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <div className="mt-6 bg-[#F5F2EC] rounded-2xl p-4 text-sm text-[#6B6867]">
        Lo staff accede a <a href="/scanner" target="_blank" className="text-[#0F0E0C] font-semibold hover:underline">/scanner</a> con le proprie credenziali per scansionare i biglietti.
      </div>
    </div>
  );
};

export default DashboardStaff;
