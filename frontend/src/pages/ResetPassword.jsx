import React, { useState } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import axios from 'axios';
import { Eye, EyeOff, QrCode, CheckCircle2 } from 'lucide-react';
import { toast } from 'sonner';

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;

const ResetPassword = () => {
    const [searchParams] = useSearchParams();
    const token = searchParams.get('token');
    const navigate = useNavigate();

    const [password, setPassword] = useState('');
    const [confirmPassword, setConfirmPassword] = useState('');
    const [showPassword, setShowPassword] = useState(false);
    const [loading, setLoading] = useState(false);
    const [success, setSuccess] = useState(false);

    if (!token) {
        return (
            <div className="min-h-screen bg-[#F5F2EC] flex items-center justify-center p-4">
                <div className="bg-white p-8 rounded-2xl shadow-elevated text-center max-w-sm w-full">
                    <h2 className="text-xl font-bold text-red-600 mb-2">Token mancante</h2>
                    <p className="text-sm text-[#6B6867] mb-6">Il link di ripristino non è valido o risulta incompleto.</p>
                    <Link to="/forgot-password" className="text-[#0F0E0C] font-semibold hover:underline">Richiedi un nuovo link</Link>
                </div>
            </div>
        );
    }

    const handleSubmit = async (e) => {
        e.preventDefault();
        if (password.length < 8) {
            toast.error('La password deve contenere almeno 8 caratteri');
            return;
        }
        if (password !== confirmPassword) {
            toast.error('Le password non coincidono');
            return;
        }

        setLoading(true);
        try {
            await axios.post(`${BACKEND_URL}/api/auth/reset-password`, { token, new_password: password });
            setSuccess(true);
            toast.success('Password aggiornata con successo!');
            setTimeout(() => navigate('/login'), 3000);
        } catch (error) {
            toast.error(error.response?.data?.detail || 'Il token è scaduto o non valido');
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
                    {success ? (
                        <div className="text-center py-4">
                            <CheckCircle2 className="w-16 h-16 text-green-500 mx-auto mb-4" />
                            <h2 className="font-bold text-xl text-green-800 mb-2">Password Aggiornata!</h2>
                            <p className="text-sm text-[#6B6867] mb-6">La tua password è stata modificata con successo.</p>
                            <Link to="/login" className="inline-block px-6 py-3 bg-[#0F0E0C] text-white rounded-xl font-semibold w-full">
                                Accedi ora
                            </Link>
                        </div>
                    ) : (
                        <>
                            <h2 className="text-center font-bold text-2xl text-[#0F0F0F] mb-2">Crea nuova password</h2>
                            <p className="text-center text-sm text-[#6B6867] mb-6">Inserisci una nuova password per il tuo account.</p>

                            <form onSubmit={handleSubmit} className="space-y-4">
                                <div>
                                    <label className="block text-sm font-medium text-[#0F0F0F] mb-2">Nuova Password</label>
                                    <div className="relative">
                                        <input
                                            type={showPassword ? 'text' : 'password'}
                                            value={password}
                                            onChange={(e) => setPassword(e.target.value)}
                                            placeholder="Minimo 8 caratteri"
                                            required
                                            className="w-full px-4 py-3 border border-[#E5E1D9] rounded-xl focus:outline-none focus:ring-2 focus:ring-[#0F0E0C]/20 focus:border-[#0F0E0C]"
                                        />
                                        <button type="button" onClick={() => setShowPassword(!showPassword)} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500">
                                            {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                                        </button>
                                    </div>
                                </div>

                                <div>
                                    <label className="block text-sm font-medium text-[#0F0F0F] mb-2">Conferma Password</label>
                                    <div className="relative">
                                        <input
                                            type={showPassword ? 'text' : 'password'}
                                            value={confirmPassword}
                                            onChange={(e) => setConfirmPassword(e.target.value)}
                                            placeholder="Ripeti la password"
                                            required
                                            className="w-full px-4 py-3 border border-[#E5E1D9] rounded-xl focus:outline-none focus:ring-2 focus:ring-[#0F0E0C]/20 focus:border-[#0F0E0C]"
                                        />
                                    </div>
                                </div>

                                <button
                                    type="submit"
                                    disabled={loading || !password || !confirmPassword}
                                    className="w-full px-6 py-3 bg-[#0F0E0C] text-white rounded-xl font-semibold hover:bg-[#292524] transition-all disabled:opacity-50 mt-4"
                                >
                                    {loading ? 'Salvataggio...' : 'Ripristina Password'}
                                </button>
                            </form>
                        </>
                    )}
                </div>
            </div>
        </div>
    );
};

export default ResetPassword;
