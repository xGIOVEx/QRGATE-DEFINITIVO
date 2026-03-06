import React, { useEffect, useState, useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import axios from 'axios';
import { Clock, Mail, Users, Send, Trash2, AlertCircle, RefreshCw } from 'lucide-react';
import { toast } from 'sonner';
import useConfirm from '@/hooks/useConfirm';

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;

const DashboardWaitlist = () => {
  const { t } = useTranslation();
  const [waitlistData, setWaitlistData] = useState({ entries: [], counts: { waiting: 0, notified: 0 } });
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('waiting');

  const fetchWaitlist = useCallback(async () => {
    try {
      setLoading(true);
      const token = localStorage.getItem('qrgate_token');
      const response = await axios.get(`${BACKEND_URL}/api/dashboard/waitlist?status=${filter}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setWaitlistData(response.data);
    } catch (error) {
      console.error('Failed to fetch waitlist', error);
    } finally {
      setLoading(false);
    }
  }, [filter]);

  useEffect(() => {
    fetchWaitlist();
  }, [fetchWaitlist]);

  const notifyEntry = async (entryId) => {
    try {
      const token = localStorage.getItem('qrgate_token');
      await axios.post(`${BACKEND_URL}/api/dashboard/waitlist/${entryId}/notify`, {}, {
        headers: { Authorization: `Bearer ${token}` }
      });
      toast.success('Notifica inviata');
      fetchWaitlist();
    } catch (error) {
      toast.error(error.response?.data?.detail || 'Errore');
    }
  };

  const deleteEntry = async (entryId) => {
    const ok = await confirm("Rimuovere questa persona dalla lista d'attesa?", { confirmLabel: 'Rimuovi', danger: true });
    if (!ok) return;

    try {
      const token = localStorage.getItem('qrgate_token');
      await axios.delete(`${BACKEND_URL}/api/dashboard/waitlist/${entryId}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      toast.success('Rimosso dalla lista');
      fetchWaitlist();
    } catch (error) {
      toast.error('Errore durante la rimozione');
    }
  };

  const maskEmail = (email) => {
    if (!email) return '';
    const [name, domain] = email.split('@');
    if (!domain) return email;
    return `${name.slice(0, 3)}***@${domain}`;
  };

  const formatDate = (dateStr) => {
    if (!dateStr) return '-';
    return new Date(dateStr).toLocaleDateString('it-IT', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  return (
    <div className="space-y-6" data-testid="dashboard-waitlist">
      <div className="flex items-center justify-between">
        <h2 className="text-[#0F0F0F]">
          <Users className="w-5 h-5 inline mr-2" />
          Lista d'Attesa
        </h2>
        <button
          onClick={fetchWaitlist}
          className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
        >
          <RefreshCw className={`w-5 h-5 ${loading ? 'animate-spin' : ''}`} />
        </button>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="bg-white border border-[#E5E1D9] rounded-xl p-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-amber-100 flex items-center justify-center">
              <Clock className="w-5 h-5 text-amber-600" />
            </div>
            <div>
              <p className="text-2xl font-bold text-[#0F0F0F]">{waitlistData.counts.waiting}</p>
              <p className="text-sm text-[#6B6867]">In attesa</p>
            </div>
          </div>
        </div>

        <div className="bg-white border border-[#E5E1D9] rounded-xl p-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-blue-100 flex items-center justify-center">
              <Send className="w-5 h-5 text-blue-600" />
            </div>
            <div>
              <p className="text-2xl font-bold text-[#0F0F0F]">{waitlistData.counts.notified}</p>
              <p className="text-sm text-[#6B6867]">Notificati</p>
            </div>
          </div>
        </div>

        <div className="bg-white border border-[#E5E1D9] rounded-xl p-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-green-100 flex items-center justify-center">
              <Users className="w-5 h-5 text-green-600" />
            </div>
            <div>
              <p className="text-2xl font-bold text-[#0F0F0F]">
                {waitlistData.counts.waiting + waitlistData.counts.notified}
              </p>
              <p className="text-sm text-[#6B6867]">Totale</p>
            </div>
          </div>
        </div>
      </div>

      {/* Filters */}
      <div className="flex gap-2">
        <button
          onClick={() => setFilter('waiting')}
          className={`px-4 py-2 rounded-lg font-medium transition-colors ${filter === 'waiting'
            ? 'bg-[#0F0E0C] text-white'
            : 'bg-white border border-[#E5E1D9] text-[#6B6867] hover:bg-gray-50'
            }`}
        >
          In Attesa
        </button>
        <button
          onClick={() => setFilter('notified')}
          className={`px-4 py-2 rounded-lg font-medium transition-colors ${filter === 'notified'
            ? 'bg-[#0F0E0C] text-white'
            : 'bg-white border border-[#E5E1D9] text-[#6B6867] hover:bg-gray-50'
            }`}
        >
          Notificati
        </button>
      </div>

      {/* Waitlist Table */}
      {loading ? (
        <div className="flex justify-center py-8">
          <div className="w-8 h-8 border-4 border-[#0F0E0C] border-t-transparent rounded-full animate-spin" />
        </div>
      ) : waitlistData.entries.length === 0 ? (
        <div className="bg-white border border-[#E5E1D9] rounded-xl p-8 text-center">
          <AlertCircle className="w-12 h-12 text-[#6B6867] mx-auto mb-4" />
          <h3 className="font-semibold text-[#0F0F0F] mb-2">Nessuna persona in lista</h3>
          <p className="text-[#6B6867]">
            La lista d'attesa si riempirà quando i biglietti o le fasce orarie saranno esauriti
          </p>
        </div>
      ) : (
        <div className="bg-white border border-[#E5E1D9] rounded-xl overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50 border-b border-[#E5E1D9]">
                <tr>
                  <th className="px-4 py-3 text-left text-sm font-semibold text-[#6B6867]">Posizione</th>
                  <th className="px-4 py-3 text-left text-sm font-semibold text-[#6B6867]">Nome</th>
                  <th className="px-4 py-3 text-left text-sm font-semibold text-[#6B6867]">Email</th>
                  <th className="px-4 py-3 text-left text-sm font-semibold text-[#6B6867]">Biglietto</th>
                  <th className="px-4 py-3 text-left text-sm font-semibold text-[#6B6867]">Data/Fascia</th>
                  <th className="px-4 py-3 text-left text-sm font-semibold text-[#6B6867]">Quantità</th>
                  <th className="px-4 py-3 text-left text-sm font-semibold text-[#6B6867]">Iscrizione</th>
                  <th className="px-4 py-3 text-left text-sm font-semibold text-[#6B6867]">Azioni</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#E5E1D9]">
                {waitlistData.entries.map((entry) => (
                  <tr key={entry.id} className="hover:bg-gray-50">
                    <td className="px-4 py-3">
                      <span className="inline-flex items-center justify-center w-8 h-8 rounded-full bg-[#0F0E0C] text-white font-bold text-sm">
                        #{entry.position}
                      </span>
                    </td>
                    <td className="px-4 py-3 font-medium text-[#0F0F0F]">
                      {entry.visitor_name}
                    </td>
                    <td className="px-4 py-3 text-[#6B6867]">
                      {maskEmail(entry.visitor_email)}
                    </td>
                    <td className="px-4 py-3 text-[#0F0F0F]">
                      {entry.ticket_name}
                    </td>
                    <td className="px-4 py-3 text-[#6B6867]">
                      {entry.slot_date ? (
                        <>
                          {entry.slot_date}
                          {entry.slot_time && <span className="ml-1 text-blue-600">{entry.slot_time}</span>}
                        </>
                      ) : '-'}
                    </td>
                    <td className="px-4 py-3 text-[#0F0F0F]">
                      {entry.quantity}
                    </td>
                    <td className="px-4 py-3 text-sm text-[#6B6867]">
                      {formatDate(entry.created_at)}
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex gap-2">
                        {entry.status === 'waiting' && (
                          <button
                            onClick={() => notifyEntry(entry.id)}
                            className="p-2 text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                            title="Invia notifica"
                          >
                            <Mail className="w-4 h-4" />
                          </button>
                        )}
                        <button
                          onClick={() => deleteEntry(entry.id)}
                          className="p-2 text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                          title="Rimuovi"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
};

export default DashboardWaitlist;
