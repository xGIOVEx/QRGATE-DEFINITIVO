import React, { useEffect, useState } from 'react';
import { Link, Routes, Route, useNavigate, useLocation } from 'react-router-dom';
import axios from 'axios';
import { toast } from 'sonner';
import { LayoutDashboard, Building2, CreditCard, ShoppingBag, Users, LogOut, QrCode, ChevronRight, CheckCircle, XCircle, Settings } from 'lucide-react';
import AdminSettings from '@/pages/AdminSettings';

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;

const getToken = () => localStorage.getItem('qrgate_token');
const headers = () => ({ Authorization: `Bearer ${getToken()}` });

// ===================== ADMIN HOME =====================
const AdminHome = () => {
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    axios.get(`${BACKEND_URL}/api/admin/kpis`, { headers: headers() })
      .then(r => setStats(r.data))
      .catch(() => toast.error('Errore caricamento stats'))
      .finally(() => setLoading(false));
  }, []);

  if (loading) return <div className="text-center py-12">Caricamento...</div>;

  const kpis = [
    { label: 'MRR (Estimated)', value: `€${(stats?.estimated_mrr_eur || 0).toFixed(2)}`, sub: 'Commissioni Rolling 30d' },
    { label: 'GMV Piattaforma', value: `€${(stats?.total_gmv_eur || 0).toFixed(2)}`, sub: 'Total Transacted Volume' },
    { label: 'Venues', value: stats?.total_venues || 0, sub: 'Total Accounts' },
    { label: 'Ordini', value: stats?.total_orders || 0, sub: 'Total successful' },
    { label: 'Activation Rate', value: `${stats?.activation_rate_pct || 0}%`, sub: 'Onboarded & Active' },
    { label: 'Time-to-ticket', value: `${stats?.avg_time_to_ticket_sec || 0}s`, sub: 'Avg checkout duration' },
  ];

  return (
    <div data-testid="admin-home">
      <div className="mb-10">
        <h2 className="text-3xl font-black text-stone-950 tracking-tight">Super Admin</h2>
        <p className="text-stone-500 font-medium mt-1">Gestione globale della piattaforma QRGate</p>
      </div>
      <div className="grid grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-6 mb-10">
        {kpis.map((k, i) => (
          <div key={i} className="bg-white rounded-3xl p-6 border border-stone-200 shadow-sm flex flex-col justify-center transition-all hover:shadow-md">
            <p className="text-[10px] font-black text-stone-400 mb-2 uppercase tracking-widest">{k.label}</p>
            <p className="text-2xl font-black text-amber-600 tabular-nums tracking-tighter">{k.value}</p>
            <p className="text-[10px] font-bold text-stone-400 mt-2 uppercase tracking-wider">{k.sub}</p>
          </div>
        ))}
      </div>
      <div className="grid md:grid-cols-2 gap-8">
        <div className="bg-white rounded-[2.5rem] p-8 border border-stone-200 shadow-sm">
          <h3 className="text-sm font-black text-stone-900 uppercase tracking-widest mb-6">Ricavi piattaforma</h3>
          <div className="space-y-4">
            <div className="flex justify-between items-center">
              <span className="text-sm font-medium text-stone-500">Questo mese (fee)</span>
              <span className="font-black text-amber-600 text-lg">€{((stats?.month_fees_cents || 0) / 100).toFixed(2)}</span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-sm font-medium text-stone-500">GMV Processato</span>
              <span className="font-black text-stone-950 text-lg">€{(stats?.total_gmv_eur || 0).toFixed(2)}</span>
            </div>
            <div className="flex justify-between items-center pt-4 border-t border-stone-100">
              <span className="text-sm font-black text-stone-950 uppercase tracking-wider">Estimated MRR</span>
              <span className="font-black text-stone-950 text-xl tracking-tighter">€{(stats?.estimated_mrr_eur || 0).toFixed(2)}</span>
            </div>
          </div>
        </div>
        <div className="bg-white rounded-[2.5rem] p-8 border border-stone-200 shadow-sm">
          <h3 className="text-sm font-black text-stone-900 uppercase tracking-widest mb-6">Azioni rapide</h3>
          <div className="space-y-3">
            <Link to="/admin/venues" className="flex items-center justify-between p-4 bg-stone-50 hover:bg-stone-100 rounded-2xl transition-all group">
              <span className="text-sm font-bold text-stone-900">Gestisci venues</span>
              <ChevronRight className="w-4 h-4 text-stone-400 group-hover:translate-x-1 transition-transform" />
            </Link>
            <Link to="/admin/orders" className="flex items-center justify-between p-4 bg-stone-50 hover:bg-stone-100 rounded-2xl transition-all group">
              <span className="text-sm font-bold text-stone-900">Tutti gli ordini</span>
              <ChevronRight className="w-4 h-4 text-stone-400 group-hover:translate-x-1 transition-transform" />
            </Link>
            <Link to="/admin/users" className="flex items-center justify-between p-4 bg-stone-50 hover:bg-stone-100 rounded-2xl transition-all group">
              <span className="text-sm font-bold text-stone-900">Utenti registrati</span>
              <ChevronRight className="w-4 h-4 text-stone-400 group-hover:translate-x-1 transition-transform" />
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
};

// ===================== ADMIN VENUES =====================
const AdminVenues = () => {
  const [venues, setVenues] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);

  const fetch = async (p = 1, s = '') => {
    setLoading(true);
    try {
      const res = await axios.get(`${BACKEND_URL}/api/admin/venues`, { headers: headers(), params: { page: p, search: s } });
      setVenues(res.data.venues);
      setTotalPages(res.data.pages);
      setPage(p);
    } catch (e) {
      toast.error('Errore');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetch(); }, []);

  const toggleStatus = async (id) => {
    try {
      const res = await axios.put(`${BACKEND_URL}/api/admin/venues/${id}/status`, {}, { headers: headers() });
      toast.success(res.data.stripe_onboarded ? 'Venue attivata' : 'Venue disattivata');
      fetch(page, search);
    } catch (e) {
      toast.error('Errore');
    }
  };

  return (
    <div data-testid="admin-venues">
      <div className="flex justify-between items-center mb-10">
        <div>
          <h2 className="text-3xl font-black text-stone-950 tracking-tight">Venues</h2>
          <p className="text-stone-500 font-medium mt-1">Lista completa delle attività registrate</p>
        </div>
        <div className="relative">
          <input value={search} onChange={e => { setSearch(e.target.value); fetch(1, e.target.value); }}
            placeholder="Cerca venue..." className="pl-4 pr-10 py-3 bg-white border border-stone-200 rounded-2xl text-sm focus:outline-none focus:ring-2 focus:ring-amber-600/20 w-64 shadow-sm" />
        </div>
      </div>
      <div className="bg-white rounded-[2rem] border border-stone-200 overflow-hidden shadow-sm">
        <table className="w-full text-sm">
          <thead className="bg-stone-50/80 border-b border-stone-100">
            <tr>
              <th className="px-6 py-4 text-left text-[10px] font-black text-stone-400 uppercase tracking-widest">Nome</th>
              <th className="px-6 py-4 text-left text-[10px] font-black text-stone-400 uppercase tracking-widest">Slug</th>
              <th className="px-6 py-4 text-left text-[10px] font-black text-stone-400 uppercase tracking-widest">Ordini</th>
              <th className="px-6 py-4 text-left text-[10px] font-black text-stone-400 uppercase tracking-widest">Fatturato</th>
              <th className="px-6 py-4 text-left text-[10px] font-black text-stone-400 uppercase tracking-widest">Stato</th>
              <th className="px-6 py-4 text-left text-[10px] font-black text-stone-400 uppercase tracking-widest">Azioni</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-stone-100">
            {venues.map(v => (
              <tr key={v.id} className="hover:bg-stone-50/50 transition-colors group">
                <td className="px-6 py-4 font-bold text-stone-900">{v.name}</td>
                <td className="px-6 py-4 text-stone-400 font-mono text-xs">/{v.slug}</td>
                <td className="px-6 py-4 text-stone-600 font-medium tabular-nums">{v.order_count}</td>
                <td className="px-6 py-4 font-black text-stone-950 tabular-nums">€{((v.total_revenue_cents || 0) / 100).toFixed(2)}</td>
                <td className="px-6 py-4">
                  {v.stripe_onboarded ? (
                    <span className="inline-flex items-center gap-1.5 px-2.5 py-1 bg-emerald-50 text-emerald-700 rounded-full text-[10px] font-black uppercase tracking-wider"><CheckCircle className="w-3 h-3" /> Attiva</span>
                  ) : (
                    <span className="inline-flex items-center gap-1.5 px-2.5 py-1 bg-amber-50 text-amber-700 rounded-full text-[10px] font-black uppercase tracking-wider"><XCircle className="w-3 h-3" /> Inattiva</span>
                  )}
                </td>
                <td className="px-6 py-4">
                  <div className="flex gap-4">
                    <a href={`/${v.slug}`} target="_blank" rel="noopener noreferrer" className="text-xs font-black uppercase tracking-widest text-amber-600 hover:text-amber-700 underline decoration-amber-600/30 underline-offset-4">Vedi</a>
                    <button onClick={() => toggleStatus(v.id)} className="text-xs font-black uppercase tracking-widest text-stone-400 hover:text-stone-900 transition-colors">
                      {v.stripe_onboarded ? 'Sospendi' : 'Attiva'}
                    </button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      {totalPages > 1 && (
        <div className="flex justify-center gap-2 mt-4">
          {Array.from({ length: totalPages }, (_, i) => i + 1).map(p => (
            <button key={p} onClick={() => fetch(p, search)}
              className={`w-10 h-10 rounded-xl text-xs font-black transition-all ${p === page ? 'bg-stone-950 text-white shadow-lg shadow-stone-950/20' : 'bg-white border border-stone-200 text-stone-400 hover:border-stone-950 hover:text-stone-950'}`}>{p}</button>
          ))}
        </div>
      )}
    </div>
  );
};

// ===================== ADMIN ORDERS =====================
const AdminOrders = () => {
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [total, setTotal] = useState(0);

  const fetch = async (p = 1) => {
    setLoading(true);
    try {
      const res = await axios.get(`${BACKEND_URL}/api/admin/orders`, { headers: headers(), params: { page: p } });
      setOrders(res.data.orders);
      setTotalPages(res.data.pages);
      setTotal(res.data.total);
      setPage(p);
    } catch (e) { toast.error('Errore'); }
    finally { setLoading(false); }
  };

  useEffect(() => { fetch(); }, []);

  return (
    <div data-testid="admin-orders">
      <div className="mb-10">
        <h2 className="text-3xl font-black text-stone-950 tracking-tight">Tutti gli ordini</h2>
        <p className="text-stone-500 font-medium mt-1">{total} transazioni totali sulla piattaforma</p>
      </div>
      <div className="bg-white rounded-[2rem] border border-stone-200 overflow-hidden shadow-sm">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-stone-50/80 border-b border-stone-100">
              <tr>
                <th className="px-6 py-4 text-left text-[10px] font-black text-stone-400 uppercase tracking-widest">Venue</th>
                <th className="px-6 py-4 text-left text-[10px] font-black text-stone-400 uppercase tracking-widest">Data</th>
                <th className="px-6 py-4 text-left text-[10px] font-black text-stone-400 uppercase tracking-widest">Email</th>
                <th className="px-6 py-4 text-left text-[10px] font-black text-stone-400 uppercase tracking-widest">Importo</th>
                <th className="px-6 py-4 text-left text-[10px] font-black text-stone-400 uppercase tracking-widest">Fee QRGate</th>
                <th className="px-6 py-4 text-left text-[10px] font-black text-stone-400 uppercase tracking-widest">Stato</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-stone-100">
              {orders.map(o => (
                <tr key={o.id} className="hover:bg-stone-50/50 transition-colors">
                  <td className="px-6 py-4 font-bold text-stone-900">{o.venue_name}</td>
                  <td className="px-6 py-4 text-stone-400 font-mono text-xs">{o.created_at?.slice(0, 16).replace('T', ' ')}</td>
                  <td className="px-6 py-4 text-stone-600 font-medium">{o.visitor_email}</td>
                  <td className="px-6 py-4 font-black text-stone-950 tabular-nums">€{((o.ticket_amount || 0) / 100).toFixed(2)}</td>
                  <td className="px-6 py-4 text-amber-600 font-black tabular-nums">€{((o.fee_amount || 0) / 100).toFixed(2)}</td>
                  <td className="px-6 py-4">
                    <span className={`inline-flex px-2.5 py-1 text-[10px] font-black uppercase tracking-wider rounded-full ${o.stripe_payment_status === 'paid' ? 'bg-emerald-50 text-emerald-700' : 'bg-red-50 text-red-700'}`}>
                      {o.stripe_payment_status === 'paid' ? 'Pagato' : 'Rimborsato'}
                    </span>
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
            <button key={p} onClick={() => fetch(p)}
              className={`w-10 h-10 rounded-xl text-xs font-black transition-all ${p === page ? 'bg-stone-950 text-white shadow-lg shadow-stone-950/20' : 'bg-white border border-stone-200 text-stone-400 hover:border-stone-950 hover:text-stone-950'}`}>{p}</button>
          ))}
        </div>
      )}
    </div>
  );
};

// ===================== ADMIN USERS =====================
const AdminUsers = () => {
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    axios.get(`${BACKEND_URL}/api/admin/users`, { headers: headers() })
      .then(r => setUsers(r.data))
      .catch(() => toast.error('Errore'))
      .finally(() => setLoading(false));
  }, []);

  return (
    <div data-testid="admin-users">
      <h2 className="text-3xl font-black text-stone-950 tracking-tight mb-10">Utenti registrati</h2>
      <div className="bg-white rounded-[2rem] border border-stone-200 overflow-hidden shadow-sm">
        <table className="w-full text-sm">
          <thead className="bg-stone-50/80 border-b border-stone-100">
            <tr>
              <th className="px-6 py-4 text-left text-[10px] font-black text-stone-400 uppercase tracking-widest">Email</th>
              <th className="px-6 py-4 text-left text-[10px] font-black text-stone-400 uppercase tracking-widest">Ruolo</th>
              <th className="px-6 py-4 text-left text-[10px] font-black text-stone-400 uppercase tracking-widest">Registrato</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-stone-100">
            {users.map(u => (
              <tr key={u.id} className="hover:bg-stone-50/50 transition-colors">
                <td className="px-6 py-4 font-bold text-stone-900">{u.email}</td>
                <td className="px-6 py-4">
                  <span className={`inline-flex px-2.5 py-1 text-[10px] font-black uppercase tracking-wider rounded-full ${u.role === 'superadmin' ? 'bg-purple-100 text-purple-700' : 'bg-blue-100 text-blue-700'}`}>{u.role}</span>
                </td>
                <td className="px-6 py-4 text-stone-400 font-medium">{u.created_at?.slice(0, 10)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
};

// ===================== ADMIN PANEL LAYOUT =====================
const AdminPanel = () => {
  const navigate = useNavigate();
  const location = useLocation();

  useEffect(() => {
    const token = localStorage.getItem('qrgate_token');
    const user = JSON.parse(localStorage.getItem('qrgate_user') || '{}');
    if (!token || user.role !== 'superadmin') {
      navigate('/login');
    }
  }, [navigate]);

  const handleLogout = () => {
    localStorage.removeItem('qrgate_token');
    localStorage.removeItem('qrgate_user');
    localStorage.removeItem('qrgate_venue');
    navigate('/');
  };

  const menuItems = [
    { icon: <LayoutDashboard className="w-5 h-5" />, label: 'Dashboard', path: '/admin' },
    { icon: <Building2 className="w-5 h-5" />, label: 'Venues', path: '/admin/venues' },
    { icon: <ShoppingBag className="w-5 h-5" />, label: 'Ordini', path: '/admin/orders' },
    { icon: <Users className="w-5 h-5" />, label: 'Utenti', path: '/admin/users' },
    { icon: <Settings className="w-5 h-5" />, label: 'Impostazioni', path: '/admin/settings' },
  ];

  return (
    <div className="min-h-screen bg-stone-50 flex">
      <aside className="w-72 bg-stone-950 flex-col hidden md:flex border-r border-white/5 shadow-2xl">
        <div className="p-8 border-b border-white/5">
          <Link to="/" className="flex items-center gap-3 group">
            <QrCode className="w-10 h-10 text-stone-50 group-hover:rotate-12 transition-transform duration-500" />
            <div>
              <span className="text-2xl font-black text-stone-50 tracking-tighter">QRGate</span>
              <div className="text-[10px] text-stone-500 font-black uppercase tracking-[0.2em] mt-0.5">Super Admin</div>
            </div>
          </Link>
        </div>
        <nav className="flex-1 p-6 space-y-2">
          {menuItems.map((item) => {
            const active = item.path === '/admin' ? location.pathname === '/admin' : location.pathname.startsWith(item.path);
            return (
              <Link key={item.path} to={item.path} data-testid={`admin-nav-${item.label.toLowerCase()}`}
                className={`flex items-center gap-4 px-5 py-4 rounded-2xl transition-all font-bold text-sm ${active ? 'bg-white text-stone-950 shadow-xl shadow-black/20' : 'text-stone-400 hover:text-stone-50 hover:bg-white/5'
                  }`}>
                {item.icon}
                <span>{item.label}</span>
              </Link>
            );
          })}
        </nav>
        <div className="p-6 border-t border-white/5">
          <button onClick={handleLogout} className="flex items-center gap-4 px-5 py-4 text-stone-400 hover:text-stone-50 hover:bg-white/5 rounded-2xl transition-all w-full font-bold text-sm">
            <LogOut className="w-5 h-5" />
            <span>Esci</span>
          </button>
        </div>
      </aside>

      <div className="flex-1 flex flex-col min-w-0">
        <main className="flex-1 p-8 md:p-12 overflow-auto">
          <Routes>
            <Route path="/" element={<AdminHome />} />
            <Route path="/venues" element={<AdminVenues />} />
            <Route path="/orders" element={<AdminOrders />} />
            <Route path="/users" element={<AdminUsers />} />
            <Route path="/settings" element={<AdminSettings />} />
          </Routes>
        </main>
      </div>
    </div>
  );
};

export default AdminPanel;
