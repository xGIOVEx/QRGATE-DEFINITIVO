import posthog from 'posthog-js';

// Costanti PostHog (in un env reale verrebbero da process.env)
const POSTHOG_KEY = process.env.REACT_APP_POSTHOG_KEY || 'phc_mock_key';
const POSTHOG_HOST = process.env.REACT_APP_POSTHOG_HOST || 'https://eu.posthog.com';

// Inizializza l'istanza globale
export const initPostHog = () => {
    posthog.init(POSTHOG_KEY, {
        api_host: POSTHOG_HOST,
        autocapture: false, // Disabilito autocapture per GDPR stricter control
        capture_pageview: false, // Gestito manualmente se serve
        disable_session_recording: true, // Non registrare i field typing
        respect_dnt: true,
        property_blacklist: ['$ip', '$current_url', 'email', 'name', 'phone'], // Global sanitize blacklist
    });
};

// Funzione Helper per pulire properties manualmente extra
const sanitizeProperties = (props) => {
    if (!props) return {};
    const safeProps = { ...props };
    const piiKeys = ['email', 'name', 'phone', 'address', 'password', 'iban', 'id_number', 'ip'];
    Object.keys(safeProps).forEach(key => {
        if (piiKeys.includes(key.toLowerCase())) {
            delete safeProps[key];
        }
    });
    return safeProps;
};

// Custom tracker wrapper
export const trackEvent = (eventName, properties = {}) => {
    try {
        const safeProps = sanitizeProperties({
            ...properties,
            device_type: /Mobi|Android/i.test(navigator.userAgent) ? 'mobile' : 'desktop'
        });

        // Non passiamo un explicit distinct_id globale qui se non settato via posthog.identify() 
        // per anonimizzare ulteriormente. Ma passiamo venue_id se c'è come props.
        posthog.capture(eventName, safeProps);
    } catch (err) {
        console.error("Tracking Error:", err);
    }
};

// Inizializziamo subito per esser pronti
initPostHog();
