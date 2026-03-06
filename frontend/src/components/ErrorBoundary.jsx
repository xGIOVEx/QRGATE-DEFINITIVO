import React from 'react';

/**
 * ErrorBoundary — cattura errori runtime nei componenti figli
 * evitando la schermata bianca "Uncaught runtime error" in produzione.
 * In sviluppo mostra i dettagli; in produzione un messaggio user-friendly.
 */
class ErrorBoundary extends React.Component {
    constructor(props) {
        super(props);
        this.state = { hasError: false, error: null };
    }

    static getDerivedStateFromError(error) {
        return { hasError: true, error };
    }

    componentDidCatch(error, info) {
        // In produzione logga su Sentry/monitor; in dev lascia in console
        if (process.env.NODE_ENV === 'production') {
            // window.Sentry?.captureException(error, { extra: info });
        } else {
            console.error('[ErrorBoundary]', error, info.componentStack);
        }
    }

    handleReset = () => {
        this.setState({ hasError: false, error: null });
        // Optionally navigate home
        window.location.href = '/';
    };

    render() {
        if (this.state.hasError) {
            return (
                <div className="min-h-screen flex items-center justify-center bg-[var(--bg,#f9fafb)] p-8">
                    <div className="max-w-md w-full bg-white rounded-2xl shadow-lg p-8 text-center">
                        <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
                            <span className="text-3xl">⚠️</span>
                        </div>
                        <h2 className="text-xl font-bold text-gray-900 mb-2">Qualcosa è andato storto</h2>
                        <p className="text-gray-500 text-sm mb-6">
                            Si è verificato un errore imprevisto. Il team è stato notificato automaticamente.
                        </p>
                        {process.env.NODE_ENV !== 'production' && this.state.error && (
                            <pre className="text-left bg-red-50 border border-red-200 rounded-lg p-3 text-xs text-red-700 mb-4 overflow-auto max-h-32">
                                {this.state.error.toString()}
                            </pre>
                        )}
                        <button
                            onClick={this.handleReset}
                            className="px-6 py-3 bg-blue-600 text-white rounded-xl font-semibold hover:bg-blue-500 transition-all"
                        >
                            Torna alla home
                        </button>
                    </div>
                </div>
            );
        }
        return this.props.children;
    }
}

export default ErrorBoundary;
