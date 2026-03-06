import React from 'react';
import { useNavigate } from 'react-router-dom';
import { QrCode, Home, ArrowLeft } from 'lucide-react';

const NotFound = () => {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen bg-[#F5F2EC] flex items-center justify-center px-4">
      <div className="text-center max-w-md">
        <div className="flex items-center justify-center gap-2 mb-8">
          <QrCode className="w-12 h-12 text-[#0F0E0C]" />
          <span className="text-4xl font-extrabold text-[#0F0E0C]">QRGate</span>
        </div>
        
        <div className="bg-white rounded-2xl shadow-elevated p-8 border border-[#E5E1D9]">
          <div className="w-24 h-24 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-6">
            <span className="text-5xl font-bold text-[#6B6867]">404</span>
          </div>
          
          <h1 className="text-2xl font-bold text-[#0F0F0F] mb-2">
            Pagina non trovata
          </h1>
          <p className="text-[#6B6867] mb-8">
            La pagina che stai cercando non esiste o è stata spostata.
          </p>
          
          <div className="flex flex-col sm:flex-row gap-3 justify-center">
            <button
              onClick={() => navigate(-1)}
              className="flex items-center justify-center gap-2 px-6 py-3 border-2 border-[#E5E1D9] rounded-xl font-semibold text-[#6B6867] hover:bg-gray-50 transition-colors"
            >
              <ArrowLeft className="w-4 h-4" />
              Torna indietro
            </button>
            <button
              onClick={() => navigate('/')}
              className="flex items-center justify-center gap-2 px-6 py-3 bg-[#0F0E0C] text-white rounded-xl font-semibold hover:bg-[#292524] transition-colors"
            >
              <Home className="w-4 h-4" />
              Vai alla home
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default NotFound;
