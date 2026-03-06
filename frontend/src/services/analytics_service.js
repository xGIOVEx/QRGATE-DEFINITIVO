import axios from 'axios';

/**
 * Enterprise Custom Analytics Service
 * Tracks business-critical events for ROI and funnel optimization.
 */

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL || 'http://localhost:8000';

class AnalyticsService {
    constructor() {
        this.sessionId = this._getOrCreateSessionId();
    }

    _getOrCreateSessionId() {
        let sid = localStorage.getItem('qrgate_session_id');
        if (!sid) {
            sid = 'sid_' + Math.random().toString(36).substr(2, 9) + '_' + Date.now();
            localStorage.setItem('qrgate_session_id', sid);
        }

        // Initialize External Providers (Placeholders)
        this._initExternalProviders(sid);

        return sid;
    }

    _initExternalProviders(sid) {
        // GA4 Initialization Mock
        console.log('[Analytics] Initializing GA4 with measurement ID: G-XXXXXXXXXX');

        // Mixpanel Initialization Mock
        console.log('[Analytics] Initializing Mixpanel for user:', sid);

        // Microsoft Clarity Initialization Mock
        console.log('[Analytics] Initializing Clarity for session:', sid);
    }

    /**
     * Track a custom event
     * @param {string} eventName - Category/Name of the event
     * @param {Object} properties - Metadata properties
     */
    async track(eventName, properties = {}) {
        const payload = {
            event: eventName,
            session_id: this.sessionId,
            timestamp: new Date().toISOString(),
            url: window.location.href,
            path: window.location.pathname,
            properties: {
                ...properties,
                userAgent: navigator.userAgent,
                language: navigator.language
            }
        };

        console.log(`[Analytics] ${eventName}:`, payload);

        try {
            // 1. Internal API
            axios.post(`${BACKEND_URL}/api/analytics/track`, payload).catch(() => { });

            // 2. GA4 Event (e.g. gtag)
            if (window.gtag) {
                window.gtag('event', eventName, properties);
            }

            // 3. Mixpanel Event
            if (window.mixpanel) {
                window.mixpanel.track(eventName, properties);
            }
        } catch (e) {
            // Ignore
        }
    }

    // Predefined events for consistency
    trackSimulatorUsed(monthlyVisitors, ticketPrice) {
        this.track('simulator_used', { monthlyVisitors, ticketPrice });
    }

    trackOnboardingStep(stepNumber, stepName) {
        this.track('onboarding_step_completed', { stepNumber, stepName });
    }

    trackCheckoutStarted(venueId, items) {
        this.track('checkout_started', { venueId, items_count: items?.length || 0 });
    }

    trackTicketScanned(result, method = 'qr') {
        this.track('ticket_scanned', { result, method });
    }

    trackLanguageSwitch(newLang) {
        this.track('language_switched', { language: newLang });
    }

    trackPricingPageViewed(source = 'navigation') {
        this.track('pricing_page_viewed', { source });
    }

    trackSimulatorInteracted(monthlyVisitors, calculatedRevenue, type = 'pricing') {
        this.track('simulator_interacted', { monthlyVisitors, calculatedRevenue, type });
    }

    trackExitIntentShown(pageType, variant) {
        this.track('exit_intent_shown', { pageType, variant });
    }

    trackExitIntentConverted(pageType, variant, type = 'form') {
        this.track('exit_intent_converted', { pageType, variant, type });
    }
}

export const analytics = new AnalyticsService();
export default analytics;
