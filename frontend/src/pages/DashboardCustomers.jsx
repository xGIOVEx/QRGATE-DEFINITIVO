import React, { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import axios from 'axios';
import { Users, Search, ShoppingBag, Calendar, ArrowRight } from 'lucide-react';
import { toast } from 'sonner';

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;

const DashboardCustomers = () => {
    const { t } = useTranslation();
    const [customers, setCustomers] = useState([]);
    const [loading, setLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState('');

    const token = localStorage.getItem('qrgate_token');
    const headers = { Authorization: `Bearer ${token}` };

    useEffect(() => {
        const fetchCustomers = async () => {
            try {
                const res = await axios.get(`${BACKEND_URL}/api/dashboard/customers`, { headers });
                setCustomers(res.data.customers || []);
            } catch (e) {
                toast.error('Errore caricamento clienti');
            } finally {
                setLoading(false);
            }
        };
        fetchCustomers();
    }, []);

    const filteredCustomers = customers.filter(c =>
        c.email.toLowerCase().includes(searchTerm.toLowerCase())
    );

    return (
        <div className="space-y-6">
            <div className="flex justify-between items-center bg-transparent">
                <div>
                    <h2 className="text-3xl font-extrabold text-[#0F0F0F] mb-1 flex items-center gap-2">
                        <Users className="w-8 h-8 text-[#0F0E0C]" />
                        <span className="text-gradient">{t('dashboard.customers', 'Clienti')}</span>
                    </h2>
                    <p className="text-[#6B6867] font-medium">Gestisci e visualizza i tuoi visitatori ricorrenti</p>
                </div>
                <div className="relative group">
                    <Search className="w-5 h-5 absolute left-3 top-1/2 -translate-y-1/2 text-[#6B6867] group-focus-within:text-[#0F0E0C] transition-colors" />
                    <input
                        type="text"
                        placeholder="Cerca per email..."
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        className="pl-10 pr-4 py-3 border border-[#E5E1D9] rounded-2xl bg-white/50 backdrop-blur-md focus:bg-white focus:outline-none focus:ring-2 focus:ring-[#0F0E0C] w-72 shadow-sm transition-all"
                    />
                </div>
            </div>

            {loading ? (
                <div className="grid gap-4">
                    {[1, 2, 3].map(i => (
                        <div key={i} className="h-28 glass rounded-2xl animate-pulse" />
                    ))}
                </div>
            ) : filteredCustomers.length === 0 ? (
                <div className="text-center py-24 glass-card">
                    <Users className="w-16 h-16 text-[#6B6867] mx-auto mb-4 opacity-20" />
                    <p className="text-[#6B6867] text-lg font-medium">Nessun cliente trovato</p>
                </div>
            ) : (
                <div className="grid gap-4">
                    {filteredCustomers.map((customer) => (
                        <div key={customer.email} className="glass-card p-6 flex flex-col justify-between relative overflow-hidden group hover:scale-[1.01]">
                            <div className="absolute inset-0 bg-gradient-to-r from-emerald-500/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity"></div>
                            <div className="flex justify-between items-center relative z-10 p-2">
                                <div className="flex items-center gap-5">
                                    <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-blue-50 to-indigo-50 dark:from-slate-800 dark:to-slate-700 flex items-center justify-center text-[#0F0E0C] font-black text-xl shadow-inner border border-white/50">
                                        {customer.email[0].toUpperCase()}
                                    </div>
                                    <div>
                                        <h3 className="font-bold text-[#0F0F0F] text-xl tracking-tight">{customer.email}</h3>
                                        <div className="flex items-center gap-4 mt-2 text-sm text-[#6B6867] font-medium">
                                            <span className="flex items-center gap-1.5 bg-[#F5F2EC] px-2.5 py-1 rounded-lg">
                                                <ShoppingBag className="w-4 h-4 text-[#0F0E0C]" /> {customer.total_orders || customer.order_count} ordini
                                            </span>
                                            <span className="flex items-center gap-1.5 bg-[#F5F2EC] px-2.5 py-1 rounded-lg">
                                                <Calendar className="w-4 h-4 text-[#0F0E0C]" /> Ultimo: {new Date(customer.last_purchase || customer.last_order).toLocaleDateString()}
                                            </span>
                                        </div>
                                    </div>
                                </div>
                                <div className="text-right flex items-center gap-6">
                                    <div>
                                        <p className="text-xs text-[#6B6867] uppercase font-bold tracking-wider mb-1">Totale speso</p>
                                        <p className="text-3xl font-black text-[#0F0E0C]">€{((customer.total_spent_cents || customer.total_spent) / 100).toFixed(2)}</p>
                                    </div>
                                    <button className="p-3 rounded-xl bg-white dark:bg-slate-800 shadow-sm border border-[#E5E1D9] group-hover:bg-[#0F0E0C] group-hover:text-white group-hover:shadow-button-hover transition-all duration-300">
                                        <ArrowRight className="w-5 h-5" />
                                    </button>
                                </div>
                            </div>
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
};

export default DashboardCustomers;
