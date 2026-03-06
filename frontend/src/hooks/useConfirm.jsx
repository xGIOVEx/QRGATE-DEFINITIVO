import { useState, useCallback } from 'react';
import { toast } from 'sonner';

/**
 * useConfirm — sostituisce window.confirm() con un toast non bloccante.
 * Su mobile window.confirm è bloccante e disabilita l'audio in iOS Safari.
 * 
 * Uso:
 *   const confirm = useConfirm();
 *   const ok = await confirm('Sei sicuro?');
 *   if (ok) { ... }
 */
const useConfirm = () => {
    const confirm = useCallback((message, { confirmLabel = 'Conferma', cancelLabel = 'Annulla', danger = true } = {}) => {
        return new Promise((resolve) => {
            toast.custom(
                (t) => (
                    <div className="bg-white rounded-2xl shadow-xl border border-gray-100 p-5 flex flex-col gap-4 max-w-sm w-full">
                        <p className="text-gray-800 font-medium text-sm leading-relaxed">{message}</p>
                        <div className="flex gap-2 justify-end">
                            <button
                                onClick={() => { toast.dismiss(t); resolve(false); }}
                                className="px-4 py-2 text-sm text-gray-600 bg-gray-100 rounded-xl hover:bg-gray-200 transition-colors font-medium"
                            >
                                {cancelLabel}
                            </button>
                            <button
                                onClick={() => { toast.dismiss(t); resolve(true); }}
                                className={`px-4 py-2 text-sm text-white rounded-xl transition-colors font-semibold ${danger ? 'bg-red-500 hover:bg-red-600' : 'bg-blue-600 hover:bg-blue-500'
                                    }`}
                            >
                                {confirmLabel}
                            </button>
                        </div>
                    </div>
                ),
                { duration: Infinity, position: 'top-center' }
            );
        });
    }, []);

    return confirm;
};

export default useConfirm;
