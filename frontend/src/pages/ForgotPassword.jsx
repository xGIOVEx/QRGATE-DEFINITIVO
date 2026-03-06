import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Link } from 'react-router-dom';
import axios from 'axios';
import { QrCode, ArrowLeft, Mail } from 'lucide-react';
import { toast } from 'sonner';

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;

const ForgotPassword = () => {
    const { t } = useTranslation();
    const [email, setEmail] = useState('');
    const [loading, setLoading] = useState(false);
    const [success, setSuccess] = useState(false);

    const handleSubmit = async (e) => {
        e.preventDefault();
        if (!email) {
            toast.error('Inserisci la tua email');
            return;
        }

        setLoading(true);
        try {
            await axios.post(`${BACKEND_URL}/api/auth/forgot-password`, { email });
            setSuccess(true);
            toast.success('Richiesta inviata con successo');
        } catch (error) {
            toast.error(error.response?.data?.detail || 'Errore durante la richiesta di ripristino');
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="min-h-screen bg-[#F5F2EC] flex items-center justify-center px-4">
            <div className="w-full max-w-md">
                <Link to="/" className="flex items-center justify-center gap-2 mb-8">
                    <QrCode className="w-10 h-10 text-[#0F0E0C]" />
                    <span className="text-3xl font-extrabold text-[#0F0E0C]" style={{ fontWeight: 800 }}>QRGate</span>
                </Link>

                <div className="bg-white rounded-2xl shadow-elevated p-8">
                    <Link to="/login" className="inline-flex items-center text-sm font-semibold text-[#6B6867] hover:text-[#0F0E0C] transition-colors mb-6">
                        <ArrowLeft className="w-4 h-4 mr-1" /> Torna al Login
                    </Link>

                    <h2 className="text-center font-bold text-2xl text-[#0F0F0F] mb-2">Password dimenticata?</h2>
                    <p className="text-center text-sm text-[#6B6867] mb-6">Inserisci l'email associata al tuo account e ti invieremo un link per creare una nuova password.</p>

                    {success ? (
                        <div className="bg-green-50 border border-green-200 rounded-xl p-6 text-center">
                            <Mail className="w-12 h-12 text-green-500 mx-auto mb-3" />
                            <h3 className="font-bold text-green-800 mb-2">Controlla la tua email</h3>
                            <p className="text-sm text-green-700">Se l'email esiste nel nostro database, riceverai un link per il ripristino entro pochi minuti.</p>
                        </div>
                    ) : (
                        <form onSubmit={handleSubmit} className="space-y-4">
                            <div>
                                <label className="block text-sm font-medium text-[#0F0F0F] mb-2">
                                    Email
                                </label>
                                <input
                                    type="email"
                                    value={email}
                                    onChange={(e) => setEmail(e.target.value)}
                                    placeholder="La tua email"
                                    required
                                    className="w-full px-4 py-3 border border-[#E5E1D9] rounded-xl focus:outline-none focus:ring-2 focus:ring-[#0F0E0C]/20 focus:border-[#0F0E0C] transition-colors"
                                />
                            </div>

                            <button
                                type="submit"
                                disabled={loading}
                                className="w-full px-6 py-3 bg-[#0F0E0C] text-white rounded-xl font-semibold hover:bg-[#292524] transition-all disabled:opacity-50"
                            >
                                {loading ? 'Invio in corso...' : 'Invia link di ripristino'}
                            </button>
                        </form>
                    )}
                </div>
            </div>
        </div>
    );
};

export default ForgotPassword;
