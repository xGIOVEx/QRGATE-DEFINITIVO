import axios from 'axios';

/**
 * Simulation Service for QRGate Automation Logic (§07)
 * Handles:
 * 1. Monthly Business Intelligence Reports
 * 2. Re-engagement Email Triggers (Zeigarnik Effect)
 * 3. Performance Insights
 */

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;

export const automationService = {
    /**
     * Triggers the 7-day Welcome Sequence (§07.2)
     */
    triggerWelcomeSequence: async (venueId, venueName, email) => {
        console.log(`[Automation] Triggering 7-day Welcome Flow for ${venueName} (${email})`);
        const sequence = [
            { day: 0, subject: "Benvenuto! La tua pagina è live", goal: "Share Link" },
            { day: 1, subject: "Dove posizionare il tuo QR Code", goal: "Physical Setup" },
            { day: 2, subject: "2 minuti per formare lo staff", goal: "Training" },
            { day: 4, subject: "5 modi per promuoverti online", goal: "Marketing" },
            { day: 7, subject: "Il tuo primo report settimanale", goal: "Engagement" }
        ];
        // Mock external trigger
        return { status: 'scheduled', sequence };
    },

    /**
     * Triggers the 30-day Re-engagement Pulse (§07.3)
     */
    triggerReengagementPulse: async (venueId, lastActive) => {
        console.log(`[Automation] Checking inactivity for ${venueId}. Last active: ${lastActive}`);
        // Simulate inactivity detection
        return { status: 'monitored', next_trigger: '30_days_inactivity' };
    },

    /**
     * Generates a structural Monthly BI Report (§07.4)
     */
    getMonthlyBIReportData: (venueId, month) => {
        return {
            venue_id: venueId,
            month: month,
            metrics: {
                total_tickets: 423,
                gross_revenue: 5076,
                qrgate_fees: 253.8,
                net_received: 4822.2,
                last_payout: "2026-02-15"
            },
            comparison: {
                growth_percent: 12,
                status: 'UP'
            },
            insights: [
                { type: 'PEAK', message: 'Il tuo picco di vendite è il Sabato alle 11:00.' },
                { type: 'DEMO', message: 'Top 3 paesi: Italia, Germania, Francia.' }
            ],
            benchmark: {
                avg_region: 350,
                status: 'ABOVE_AVERAGE'
            },
            personalized_tip: "Aggiungi l'inglese al checkout per migliorare la conversione dei turisti stranieri."
        };
    }
};
