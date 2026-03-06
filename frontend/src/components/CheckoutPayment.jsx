import React, { useState } from 'react';
import { useStripe, useElements, PaymentElement } from '@stripe/react-stripe-js';
import { Lock } from 'lucide-react';

export default function CheckoutPayment({ amount, onPaymentSuccess, clientSecret }) {
    const stripe = useStripe();
    const elements = useElements();
    const [errorMessage, setErrorMessage] = useState(null);
    const [isProcessing, setIsProcessing] = useState(false);

    const handleSubmit = async (e) => {
        e.preventDefault();
        if (!stripe || !elements) return;

        setIsProcessing(true);
        setErrorMessage(null);

        const { error, paymentIntent } = await stripe.confirmPayment({
            elements,
            confirmParams: {
                // Return URL non necessaria se redirect='if_required', ma gestiamo entrambi
                return_url: window.location.origin + '/payment-callback',
            },
            redirect: 'if_required'
        });

        if (error) {
            setErrorMessage(error.message);
            setIsProcessing(false);
        } else if (paymentIntent && paymentIntent.status === 'succeeded') {
            setIsProcessing(false);
            onPaymentSuccess(paymentIntent.id);
        }
    };

    return (
        <form onSubmit={handleSubmit} className="w-full flex flex-col gap-6">
            <div className="bg-white rounded-xl border border-gray-200 p-4 sm:p-6 shadow-sm">
                <PaymentElement options={{
                    layout: 'tabs',
                    paymentMethodOrder: ['apple_pay', 'google_pay', 'card', 'sepa_debit']
                }} />
            </div>

            {errorMessage && (
                <div className="bg-red-50 text-red-600 p-4 rounded-xl text-sm font-medium border border-red-100">
                    {errorMessage}
                </div>
            )}

            <button
                type="submit"
                disabled={isProcessing || !stripe || !elements}
                className="w-full h-14 bg-black text-white rounded-2xl font-semibold text-lg hover:bg-gray-900 active:scale-[0.98] transition-all disabled:opacity-50 flex items-center justify-center gap-2"
            >
                {isProcessing ? (
                    <div className="w-6 h-6 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                ) : (
                    <>
                        Paga EUR {(amount / 100).toFixed(2).replace('.', ',')} e ricevi i biglietti
                    </>
                )}
            </button>

            <div className="flex items-center justify-center gap-2 text-gray-400 text-xs">
                <Lock className="w-3.5 h-3.5" />
                <span>Pagamento sicuro · Stripe</span>
            </div>
        </form>
    );
}
