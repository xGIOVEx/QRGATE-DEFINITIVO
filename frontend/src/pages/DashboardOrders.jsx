import React, { useEffect, useState, useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import axios from 'axios';
import { RefreshCw, Download, Eye, RotateCcw, Bell } from 'lucide-react';
import { toast } from 'sonner';
import useConfirm from '@/hooks/useConfirm';

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;

const DashboardOrders = () => {
  const { t } = useTranslation();
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [total, setTotal] = useState(0);
  const [filterDays, setFilterDays] = useState('');
  const [filterStatus, setFilterStatus] = useState('');
  const [selectedOrder, setSelectedOrder] = useState(null);

  const token = localStorage.getItem('qrgate_token');
  const headers = { Authorization: `Bearer ${token}` };
  const confirm = useConfirm();

  const fetchOrders = async (p = 1) => {
    setLoading(true);
    try {
      const params = { page: p, limit: 20 };
      if (filterDays) params.days = filterDays;
      if (filterStatus) params.status = filterStatus;
      const res = await axios.get(`${BACKEND_URL}/api/dashboard/orders`, { headers, params });
      setOrders(res.data.orders);
      setTotalPages(res.data.pages);
      setTotal(res.data.total);
      setPage(p);
    } catch (e) {
      toast.error('Errore caricamento ordini');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchOrders(); }, [filterDays, filterStatus]);

  // D3: Real-Time Order Notifications
  useEffect(() => {
    let lastId = null;
    const poll = async () => {
      try {
        const res = await axios.get(`${BACKEND_URL}/api/dashboard/orders?limit=1`, { headers });
        const latest = res.data.orders[0];
        if (latest && lastId && latest.id !== lastId) {
          toast.success(`Nuovo ordine ricevuto! €${((latest.ticket_amount || 0) / 100).toFixed(2)}`, {
            icon: <Bell className="w-4 h-4 text-emerald-500" />,
            description: latest.visitor_email
          });
          fetchOrders(page);
        }
        if (latest) lastId = latest.id;
      } catch (e) { console.error("Poll error", e); }
    };
    const interval = setInterval(poll, 15000);
    return () => clearInterval(interval);
  }, [page]);

  const handleRefund = async (orderId) => {
    const ok = await confirm('Rimborsare questo ordine? L\'operazione non è reversibile.', { confirmLabel: 'Rimborsa', danger: true });
    if (!ok) return;
    try {
      await axios.post(`${BACKEND_URL}/api/dashboard/orders/${orderId}/refund`, {}, { headers });
      toast.success('Ordine rimborsato con successo');
      fetchOrders(page);
    } catch (e) {
      toast.error(e.response?.data?.detail || 'Errore rimborso');
    }
  };

  const handleExport = () => {
    const url = `${BACKEND_URL}/api/dashboard/reports/export`;
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('Authorization', `Bearer ${token}`);
    window.open(`${url}?token=${token}`, '_blank');
  };

  const downloadCsv = async () => {
    try {
      const res = await axios.get(`${BACKEND_URL}/api/dashboard/reports/export`, {
        headers, responseType: 'blob'
      });
      const url = window.URL.createObjectURL(new Blob([res.data]));
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', 'ordini.csv');
      document.body.appendChild(link);
      link.click();
      link.remove();
      toast.success('CSV scaricato');
    } catch (e) {
      toast.error('Errore download');
    }
  };

  const statusBadge = (status) => {
    const map = {
      paid: 'bg-emerald-50 text-emerald-700',
      refunded: 'bg-red-50 text-red-700',
      pending: 'bg-amber-50 text-amber-700',
    };
    const labels = { paid: 'Pagato', refunded: 'Rimborsato', pending: 'In attesa' };
    return <span className={`px-2 py-0.5 text-xs font-medium rounded-full ${map[status] || 'bg-gray-100 text-gray-700'}`}>{labels[status] || status}</span>;
  };

  return (
    <div data-testid="orders-page">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-8">
        <div>
          <h2 className="text-[#0F0F0F]">Ordini</h2>
          <p className="text-[#6B6867] mt-1">{total} ordini totali</p>
        </div>
        <div className="flex gap-2 flex-wrap">
          <select value={filterDays} onChange={e => setFilterDays(e.target.value)}
            className="px-3 py-2 border border-[#E5E1D9] rounded-xl text-sm focus:outline-none">
            <option value="">Tutti i periodi</option>
            <option value="7">Ultimi 7 giorni</option>
            <option value="30">Ultimi 30 giorni</option>
            <option value="90">Ultimi 90 giorni</option>
          </select>
          <select value={filterStatus} onChange={e => setFilterStatus(e.target.value)}
            className="px-3 py-2 border border-[#E5E1D9] rounded-xl text-sm focus:outline-none">
            <option value="">Tutti gli stati</option>
            <option value="paid">Pagati</option>
            <option value="refunded">Rimborsati</option>
          </select>
          <button onClick={downloadCsv} data-testid="export-csv-btn"
            className="flex items-center gap-2 px-4 py-2 border border-[#E5E1D9] rounded-xl text-sm font-medium hover:bg-[#F5F2EC] transition-all">
            <Download className="w-4 h-4" /> CSV
          </button>
        </div>
      </div>

      {loading ? (
        <div className="text-center py-12">Caricamento...</div>
      ) : orders.length === 0 ? (
        <div className="text-center py-16 bg-white rounded-2xl border border-[#E5E1D9]">
          <p className="text-[#6B6867]">Nessun ordine trovato</p>
        </div>
      ) : (
        <>
          <div className="bg-white rounded-2xl border border-[#E5E1D9] overflow-hidden shadow-card">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-[#F5F2EC] border-b border-[#E5E1D9]">
                  <tr>
                    <th className="px-4 py-3 text-left font-semibold text-[#6B6867]">Data</th>
                    <th className="px-4 py-3 text-left font-semibold text-[#6B6867]">Biglietto</th>
                    <th className="px-4 py-3 text-left font-semibold text-[#6B6867]">Email</th>
                    <th className="px-4 py-3 text-left font-semibold text-[#6B6867]">Importo</th>
                    <th className="px-4 py-3 text-left font-semibold text-[#6B6867]">Canale</th>
                    <th className="px-4 py-3 text-left font-semibold text-[#6B6867]">Stato</th>
                    <th className="px-4 py-3 text-left font-semibold text-[#6B6867]">Azione</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#E5E1D9]">
                  {orders.map(order => (
                    <tr key={order.id} className="hover:bg-[#F5F2EC] transition-colors">
                      <td className="px-4 py-3 text-[#6B6867]">{order.created_at?.slice(0, 16).replace('T', ' ')}</td>
                      <td className="px-4 py-3 font-medium text-[#0F0F0F]">{order.ticket_name} ×{order.quantity}</td>
                      <td className="px-4 py-3 text-[#6B6867]">{order.visitor_email}</td>
                      <td className="px-4 py-3 font-semibold text-[#0F0F0F]">€{((order.ticket_amount || 0) / 100).toFixed(2)}</td>
                      <td className="px-4 py-3">
                        <span className={`px-2 py-0.5 text-xs rounded-full font-medium ${order.channel === 'online' ? 'bg-blue-50 text-blue-700' : 'bg-purple-50 text-purple-700'}`}>
                          {order.channel === 'online' ? 'Online' : 'Entrata'}
                        </span>
                      </td>
                      <td className="px-4 py-3">{statusBadge(order.stripe_payment_status)}</td>
                      <td className="px-4 py-3">
                        {order.stripe_payment_status === 'paid' && (
                          <button onClick={() => handleRefund(order.id)} data-testid={`refund-${order.id}`}
                            className="flex items-center gap-1 text-xs text-red-600 hover:text-red-700 font-medium">
                            <RotateCcw className="w-3 h-3" /> Rimborsa
                          </button>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
          {totalPages > 1 && (
            <div className="flex justify-center gap-2 mt-4">
              {Array.from({ length: totalPages }, (_, i) => i + 1).map(p => (
                <button key={p} onClick={() => fetchOrders(p)}
                  className={`w-8 h-8 rounded-lg text-sm font-medium transition-colors ${p === page ? 'bg-[#0F0E0C] text-white' : 'bg-white border border-[#E5E1D9] hover:bg-[#F5F2EC]'}`}>
                  {p}
                </button>
              ))}
            </div>
          )}
        </>
      )}
    </div>
  );
};

export default DashboardOrders;
