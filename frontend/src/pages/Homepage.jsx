import React, { useState, useEffect, useRef } from 'react';
import { useTranslation } from 'react-i18next';
import { motion, useInView, AnimatePresence } from 'framer-motion';
import {
  QrCode, Users, Globe, BarChart2, TrendingUp, CheckCircle,
  ArrowRight, Zap, Star, Activity, Building2, Ticket, PlayCircle,
  CreditCard, Shield, Smartphone, Clock, AlertTriangle, ChevronRight,
  MapPin, Download, Wifi, WifiOff, Lock, TrendingDown, Euro, X,
  Search, Share2
} from 'lucide-react';
import Navbar from '@/components/Navbar';
import Footer from '@/components/Footer';
import { Link } from 'react-router-dom';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@/components/ui/accordion';
import { analytics } from '../services/analytics_service';

/* ────────────────────────────────────────────────────────
   ANIMATION SYSTEM
──────────────────────────────────────────────────────── */
const ease = [0.16, 1, 0.3, 1];

const fadeUp = {
  hidden: { opacity: 0, y: 28 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.65, ease } }
};

const stagger = {
  hidden: {},
  visible: { transition: { staggerChildren: 0.09, delayChildren: 0.05 } }
};

const SceneIn = ({ children, className = '', delay = 0 }) => {
  const ref = useRef(null);
  const inView = useInView(ref, { once: true, margin: '-72px' });
  return (
    <motion.div
      ref={ref}
      initial="hidden"
      animate={inView ? 'visible' : 'hidden'}
      variants={fadeUp}
      transition={{ delay }}
      className={className}
    >
      {children}
    </motion.div>
  );
};

/* ────────────────────────────────────────────────────────
   COPY SYSTEM  — dual language, psychologically engineered
──────────────────────────────────────────────────────── */
const COPY_IT = {
  announcement: { pre: 'Offerta Lancio Europa:', bold: 'Commissione 3% fissa', post: 'per i primi 50 musei', cta: 'Prenota il tuo posto →' },
  hero: {
    eyebrow: 'Biglietteria · Audioguide AI · Pagina pubblica · Analytics · Scanner offline',
    h1a: 'Ogni minuto di coda',
    h1b: 'è un visitatore che se ne va.',
    sub: 'QRGate trasforma il tuo ingresso in una macchina da incasso automatica. Biglietteria, audioguide in 20 lingue, pagina pubblica, analytics, scanner offline: tutto incluso. Zero hardware. Zero formazione. Zero canone fissi. Il visitatore scansiona, paga in 15 secondi, entra.',
    cta1: 'Attiva Museo Gratis',
    cta2: 'Guarda Demo 3 min',
    badge1: 'Zero Hardware',
    badge2: 'Attivo in 24 ore',
    badge3: 'Certificato GDPR',
    social1: 'Biglietti venduti',
    social2: 'Siti attivi',
    social3: 'Commissione fissa'
  },
  noWebsite: {
    eyebrow: 'Non hai un sito web?',
    h2: 'QRGate diventa il tuo sito web.',
    sub: 'Non serve avere un sito. Non serve avere un\'app. Non serve avere nulla. Con QRGate ottieni una pagina pubblica professionale per il tuo museo — con foto, orari, descrizione in 20 lingue e biglietteria integrata — in meno di 10 minuti.',
    items: [
      { icon: 'Globe', title: 'Pagina pubblica professionale', desc: 'Una URL unica per la tua struttura: qrgate.io/nome-museo. Foto copertina, logo, orari, descrizione tradotta automaticamente in 20 lingue.' },
      { icon: 'QrCode', title: 'QR Code stampabile', desc: 'Un poster A4 personalizzato con il tuo logo. Lo stampi, lo incornici, lo metti all\'ingresso. I visitatori scansionano e acquistano.' },
      { icon: 'Share2', title: 'Link da condividere ovunque', desc: 'Su Instagram, Google Maps, nelle email, nelle guide turistiche. Ogni link porta alla tua pagina con biglietteria live.' },
      { icon: 'Search', title: 'Indicizzato su Google', desc: 'La pagina è ottimizzata per i motori di ricerca in tutte le lingue europee. I turisti che cercano online trovano te — non i concorrenti.' }
    ],
    cta: 'Crea la tua pagina gratis →',
    example: { label: 'La tua pagina pubblica avrà questo aspetto:', url: 'qrgate.io/il-tuo-museo' }
  },
  aria: {
    eyebrow: 'Aria Guide — La tua guida intelligente',
    h2: 'L\'audioguida che parla 20 lingue. Da sola.',
    sub: 'Il 68% dei visitatori stranieri abbandona la visita prima del tempo per mancanza di contenuti nella propria lingua. Aria Guide elimina questo problema in automatico — e genera entrate aggiuntive senza che tu faccia nulla.',
    features: [
      { n: '01', title: '20 lingue automatiche', desc: 'Il visitatore arriva con un telefono in qualsiasi lingua. Aria Guide parla la sua lingua — senza configurazioni.' },
      { n: '02', title: 'Generata dalla tua storia', desc: 'Carichi i tuoi testi, le tue schede, le tue foto. Aria le trasforma in un racconto coinvolgente con voce AI naturale.' },
      { n: '03', title: '35% di ogni vendita va a te', desc: 'L\'audioguida costa €3-5 extra. Il visitatore la acquista durante il checkout. Il 35% del ricavato arriva sul tuo IBAN come il biglietto.' },
      { n: '04', title: 'Funziona offline', desc: 'Cantine, cortili senz\'antenna, zone remote. L\'audio è già sul telefono del visitatore. Nessuna interruzione.' }
    ],
    badge: 'Ricavo medio per sito: +€890/mese',
    cta: 'Scopri Aria Guide →',
    note: 'Disponibile per tutti i venue. Configurabile in 30 minuti dalla prima attivazione.',
    languages: ['IT', 'EN', 'DE', 'FR', 'ES', 'PT', 'NL', 'PL', 'JA', 'ZH', 'AR', 'RU', 'TR', 'KO', 'HI', 'SV', 'DA', 'FI', 'EL', '+altro']
  },
  european: {
    eyebrow: 'Pensato per l\'Europa, non per l\'America',
    h2: 'Ogni turista che visita l\'Europa merita la tua storia — nella sua lingua.',
    sub: 'Il 73% dei visitatori dei musei europei viene dall\'estero. La maggior parte non parla italiano. Con QRGate, la tua biglietteria parla la loro lingua in automatico.',
    markets: [
      { flag: '🇮🇹', lang: 'Italiano', visitors: '118M visitatori/anno' },
      { flag: '🇩🇪', lang: 'Tedesco', visitors: '89M visitatori/anno' },
      { flag: '🇫🇷', lang: 'Francese', visitors: '93M visitatori/anno' },
      { flag: '🇪🇸', lang: 'Spagnolo', visitors: '84M visitatori/anno' },
      { flag: '🇬🇧', lang: 'Inglese', visitors: '71M visitatori/anno' },
      { flag: '🇯🇵', lang: 'Giapponese', visitors: '12M visitatori/anno' },
      { flag: '🇨🇳', lang: 'Cinese', visitors: '18M visitatori/anno' },
      { flag: '🇰🇷', lang: 'Coreano', visitors: '8M visitatori/anno' },
      { flag: '🌍', lang: '+12 lingue', visitors: 'Auto-detect' }
    ],
    compliance: 'Tutti i dati restano in Europa. Server in Irlanda (AWS eu-west-1). GDPR by design. DPA in 24 ore.'
  },
  pain: {
    eyebrow: 'Il problema invisibile',
    h2: 'Le code uccidono il tuo brand.',
    sub: 'I turisti internazionali hanno poco tempo. Ogni minuto di attesa è una recensione negativa o un visitatore che decide di non entrare.',
    stat1n: '42%',
    stat1l: 'Abbandona la coda dopo 10 minuti',
    stat2n: '15s',
    stat2l: 'Tempo medio acquisto QRGate',
    stat3n: '68%',
    stat3l: 'Vogliono info nella loro lingua',
    stat4n: '0',
    stat4l: 'Hardware da acquistare',
    insight: 'Il costo reale della coda non è solo il biglietto perso oggi, ma il passaparola negativo di domani.',
    insightRole: 'Direttore Marketing Museale'
  },
  competitors: {
    eyebrow: 'Il Futuro è Arrivato',
    h2: 'Non restare agli anni \'90.',
    sub: 'Mentre gli altri vendono hardware e canoni fissi, noi vendiamo velocità e scalabilità.',
    col1: 'Sistemi Tradizionali (Eventbrite, TicketOne)',
    rows: [
      ['Hardware', 'Costi fissi elevati', 'ZERO - Usa lo smartphone'],
      ['Lingue', 'Audio guide igienizzate', '20+ Lingue automatiche'],
      ['Setup', 'Settimane di installazione', 'In 24 ore sei online'],
      ['Prezzo', 'Canone fisso + %', 'Pay-as-you-go']
    ]
  },
  howItworks: {
    eyebrow: 'Processo in 3 step',
    h2: 'Dagli anni \'90 al futuro in 24 ore.',
    sub: 'Un processo talmente semplice che non richiede formazione del personale.',
    steps: [
      { n: '01', title: 'Attiva la tua struttura', desc: 'Carica logo, orari e descrizione. Aria Guide traduce tutto in automatico.', tag: '10 minuti', accent: 'bg-stone-50 border-stone-100', icon: Building2 },
      { n: '02', title: 'Stampa il QR Code', desc: 'Posizionalo all\'ingresso. Il visitatore scansiona e paga con Apple/Google Pay.', tag: 'Zero App', accent: 'bg-stone-50 border-stone-100', icon: QrCode },
      { n: '03', title: 'Ricevi i fondi', desc: 'I soldi arrivano sul tuo IBAN in 24-48h. Gestisci ticket e rimborsi dal dashboard.', tag: 'Settlement veloce', accent: 'bg-stone-50 border-stone-100', icon: Euro }
    ]
  },
  features: {
    eyebrow: 'Potenza pura',
    h2: 'Tutto quello che serve.',
    sub: 'Una piattaforma completa studiata per le esigenze dei direttori museali europei.',
    items: [
      { icon: Smartphone, title: 'Check-in Veloce', desc: 'Scanner offline integrato per validare i ticket anche senza internet.', tag: 'Scanner App' },
      { icon: Shield, title: 'Privacy Totale', desc: 'Conformità GDPR e gestione dati visitatori sicura e privata.', tag: 'GDPR' },
      { icon: BarChart2, title: 'Real-time Analytics', desc: 'Vedi da dove vengono i tuoi visitatori e quanto spendono in tempo reale.', tag: 'Data' },
      { icon: Globe, title: 'Multi-lingua', desc: 'Menu e supporto in 20+ lingue per accogliere turisti da tutto il mondo.', tag: 'i18n' },
      { icon: CreditCard, title: 'Pagamenti Rapidi', desc: 'Apple Pay e Google Pay per chiudere l\'acquisto in 15 secondi.', tag: 'Payment' },
      { icon: Zap, title: 'Integrazione API', desc: 'Collega QRGate ai tuoi sistemi esistenti o marketplace internazionali.', tag: 'API' }
    ]
  },
  sim: {
    eyebrow: 'Simulatore ROI',
    h2: 'Quanto stai perdendo?',
    sub: 'Calcola il potenziale di fatturato inespresso della tua struttura.',
    label: 'Visitatori Mensili',
    placeholder: 'es. 5000',
    note: 'Il calcolo si basa su una conversione media del 23% e un ticket di €10.',
    resultLabel: 'Ricavo potenziale mensile',
    resultSub: 'Questi sono fondi che oggi stai lasciando sul tavolo a causa delle code e della mancanza di multilingualità.',
    cta: 'Recupera questo fatturato ora →',
    empty: 'Inserisci il numero di visitatori per vedere il calcolo'
  },
  pricing: {
    eyebrow: 'Pricing Trasparente',
    h2: 'Cresciamo solo se cresci tu.',
    sub: 'Nessun costo fisso. Nessun hardware da acquistare. Solo una commissione sul venduto.',
    priceLead: 'Esempio su un biglietto da €10:',
    example: { gross: '€ 10,00', feeLabel: 'Commissione QRGate', fee: '€ 0,99', netLabel: 'Il tuo incasso netto', net: '€ 9,01' },
    included: 'Sempre incluso nel prezzo:',
    items: [
      'Scanner App illimitata', 'Audioguida Aria AI (Revenue Share)', 'Customer Support 24/7', 'Tutti i metodi di pagamento'
    ],
    cta: 'Attiva ora senza carta →',
    risk: 'Nessun impegno. Puoi disdire in qualsiasi momento.',
    altTitle: 'Costi Sistemi Tradizionali',
    altItems: ['Installazione hardware', 'Manutenzione annuale', 'Canone mensile fisso', 'Formazione personale locale']
  },
  social: {
    eyebrow: 'Cosa dicono di noi',
    h2: 'Testimonianze reali.',
    items: [
      { stars: 5, quote: 'Abbiamo ridotto le code del 90% nel primo mese. I turisti adorano non dover scaricare app.', name: 'Marco R.', role: 'Curatore Museale', metric: '+124% Vendite' },
      { stars: 5, quote: 'Aria Guide è incredibile. I visitatori giapponesi e cinesi finalmente capiscono la nostra storia.', name: 'Elena V.', role: 'Responsabile Didattica', metric: '+35% Revenue' },
      { stars: 5, quote: 'Setup in una mattina. Non pensavo fosse possibile digitalizzare un castello in così poco tempo.', name: 'Giuseppe T.', role: 'Proprietario Dimora Storica', metric: 'Live in 3h' }
    ]
  },
  faq: {
    eyebrow: 'Domande Frequenti',
    h2: 'Dubbi? Ecco le risposte.',
    items: [
      { q: 'Serve una connessione internet per scansionare?', a: 'No, l\'app scanner funziona anche offline e sincronizza i dati appena torna il segnale.' },
      { q: 'Come ricevo i pagamenti?', a: 'Ricevi i fondi direttamente sul tuo IBAN tramite Stripe. Il settlement avviene ogni 24-48 ore.' },
      { q: 'Posso usare QRGate insieme al mio sistema attuale?', a: 'Assolutamente sì. Molti nostri clienti usano QRGate solo per le code o per le audioguide Aria.' }
    ]
  },
  cta: {
    eyebrow: 'Pronto a partire?',
    h2: 'Il futuro della tua struttura è a un QR Code di distanza.',
    sub: 'Attiva QRGate oggi. Ricevi i primi pagamenti domani. Zero rischi, tutto da guadagnare.',
    cta1: 'Inizia Ora Gratis',
    cta2: 'Prenota una Demo',
    micro: 'Nessuna carta di credito richiesta · Setup in 10 minuti'
  }
};

const COPY_EN = {
  announcement: { pre: 'Europe Launch Offer:', bold: 'Fixed 3% commission', post: 'for the first 50 museums', cta: 'Reserve your spot →' },
  hero: {
    eyebrow: 'Ticketing · AI Audioguides · Public Page · Analytics · Offline Scanner',
    h1a: 'Every minute in line',
    h1b: 'is a visitor walking away.',
    sub: 'QRGate is your complete venue management platform. Ticketing, AI audioguides in 20 languages, public page, analytics, offline scanner — everything included. Zero hardware. Zero training. Zero fixed fees. Visitors scan, pay in 15 seconds, enter.',
    cta1: 'Activate Museum Free',
    cta2: 'Watch 3 min Demo',
    badge1: 'Zero Hardware',
    badge2: 'Live in 24 hours',
    badge3: 'GDPR Certified',
    social1: 'Tickets sold',
    social2: 'Active sites',
    social3: 'Fixed commission'
  },
  noWebsite: {
    eyebrow: 'No website?',
    h2: 'QRGate becomes your website.',
    sub: 'No website needed. No app needed. Nothing. With QRGate you get a professional public page for your museum — with photos, opening hours, description in 20 languages and integrated ticketing — in less than 10 minutes.',
    items: [
      { icon: 'Globe', title: 'Professional public page', desc: 'A unique URL for your venue: qrgate.io/museum-name. Cover photo, logo, hours, description automatically translated into 20 languages.' },
      { icon: 'QrCode', title: 'Printable QR Code', desc: 'A custom A4 poster with your logo. Print it, frame it, place it at the entry. Visitors scan and buy.' },
      { icon: 'Share2', title: 'Link to share everywhere', desc: 'On Instagram, Google Maps, in emails, in tourist guides. Every link leads to your live ticketing page.' },
      { icon: 'Search', title: 'Indexed on Google', desc: 'The page is SEO-optimised in all European languages. Tourists searching online find you — not your competitors.' }
    ],
    cta: 'Create your page free →',
    example: { label: 'Your public page will look like this:', url: 'qrgate.io/your-museum' }
  },
  aria: {
    eyebrow: 'Aria Guide — Your intelligent guide',
    h2: 'The audioguide that speaks 20 languages. On its own.',
    sub: '68% of international visitors leave early due to lack of content in their language. Aria Guide eliminates this automatically — and generates additional income without any effort from you.',
    features: [
      { n: '01', title: '20 automatic languages', desc: 'A visitor arrives with a phone in any language. Aria Guide speaks their language — no configuration required.' },
      { n: '02', title: 'Generated from your history', desc: 'You upload your texts, fact sheets, photos. Aria transforms them into an engaging narrative with natural AI voice.' },
      { n: '03', title: '35% of each sale goes to you', desc: 'The audioguide costs €3-5 extra. The visitor buys it during checkout. 35% of the revenue lands in your IBAN like a ticket.' },
      { n: '04', title: 'Works offline', desc: 'Basements, courtyards, remote areas. The audio is already on the visitor\'s phone. No interruptions.' }
    ],
    badge: 'Average revenue per site: +€890/month',
    cta: 'Discover Aria Guide →',
    note: 'Available for all venues. Configurable in 30 minutes from first activation.',
    languages: ['IT', 'EN', 'DE', 'FR', 'ES', 'PT', 'NL', 'PL', 'JA', 'ZH', 'AR', 'RU', 'TR', 'KO', 'HI', 'SV', 'DA', 'FI', 'EL', '+more']
  },
  european: {
    eyebrow: 'Built for Europe, not America',
    h2: 'Every tourist visiting Europe deserves your story — in their language.',
    sub: '73% of European museum visitors come from abroad. Most don\'t speak the local language. With QRGate, your ticketing speaks their language automatically.',
    markets: [
      { flag: '🇮🇹', lang: 'Italian', visitors: '118M visitors/year' },
      { flag: '🇩🇪', lang: 'German', visitors: '89M visitors/year' },
      { flag: '🇫🇷', lang: 'French', visitors: '93M visitors/year' },
      { flag: '🇪🇸', lang: 'Spanish', visitors: '84M visitors/year' },
      { flag: '🇬🇧', lang: 'English', visitors: '71M visitors/year' },
      { flag: '🇯🇵', lang: 'Japanese', visitors: '12M visitors/year' },
      { flag: '🇨🇳', lang: 'Chinese', visitors: '18M visitors/year' },
      { flag: '🇰🇷', lang: 'Korean', visitors: '8M visitors/year' },
      { flag: '🌍', lang: '+12 languages', visitors: 'Auto-detect' }
    ],
    compliance: 'All data stays in Europe. Servers in Ireland (AWS eu-west-1). GDPR by design. DPA in 24 hours.'
  },
  pain: {
    eyebrow: 'The invisible problem',
    h2: 'Queues kill your brand.',
    sub: 'International tourists have little time. Every minute of waiting is a negative review or a visitor deciding not to enter.',
    stat1n: '42%',
    stat1l: 'Abandon the queue after 10 minutes',
    stat2n: '15s',
    stat2l: 'Average QRGate purchase time',
    stat3n: '68%',
    stat3l: 'Want info in their language',
    stat4n: '0',
    stat4l: 'Hardware to buy',
    insight: 'The real cost of the queue is not just the ticket lost today, but the negative word of mouth of tomorrow.',
    insightRole: 'Museum Marketing Director'
  },
  competitors: {
    eyebrow: 'The Future is Here',
    h2: 'Don\'t stay in the 90s.',
    sub: 'While others sell hardware and fixed fees, we sell speed and scalability.',
    col1: 'Traditional Systems (Eventbrite, TicketOne)',
    rows: [
      ['Hardware', 'High fixed costs', 'ZERO - Use your smartphone'],
      ['Languages', 'Sanitised audio guides', '20+ Automatic languages'],
      ['Setup', 'Weeks of installation', 'Live in 24 hours'],
      ['Pricing', 'Fixed fee + %', 'Pay-as-you-go']
    ]
  },
  howItworks: {
    eyebrow: '3-Step Process',
    h2: 'From the 90s to the future in 24 hours.',
    sub: 'A process so simple it requires no staff training.',
    steps: [
      { n: '01', title: 'Activate your venue', desc: 'Upload logo, hours, and description. Aria Guide translates everything automatically.', tag: '10 minutes', accent: 'bg-stone-50 border-stone-100', icon: Building2 },
      { n: '02', title: 'Print the QR Code', desc: 'Place it at the entry. The visitor scans and pays with Apple/Google Pay.', tag: 'Zero App', accent: 'bg-stone-50 border-stone-100', icon: QrCode },
      { n: '03', title: 'Receive funds', desc: 'Funds land in your IBAN in 24-48h. Manage tickets and refunds from the dashboard.', tag: 'Fast settlement', accent: 'bg-stone-50 border-stone-100', icon: Euro }
    ]
  },
  features: {
    eyebrow: 'Pure power',
    h2: 'Everything you need.',
    sub: 'A complete platform designed for the needs of European museum directors.',
    items: [
      { icon: Smartphone, title: 'Fast Check-in', desc: 'Integrated offline scanner to validate tickets even without internet.', tag: 'Scanner App' },
      { icon: Shield, title: 'Total Privacy', desc: 'GDPR compliance and secure, private visitor data management.', tag: 'GDPR' },
      { icon: BarChart2, title: 'Real-time Analytics', desc: 'See where your visitors come from and how much they spend in real time.', tag: 'Data' },
      { icon: Globe, title: 'Multi-language', desc: 'Menu and support in 20+ languages to welcome tourists from around the world.', tag: 'i18n' },
      { icon: CreditCard, title: 'Quick Payments', desc: 'Apple Pay and Google Pay to close the purchase in 15 seconds.', tag: 'Payment' },
      { icon: Zap, title: 'Integrazione API', desc: 'Connect QRGate to your existing systems or international marketplaces.', tag: 'API' }
    ]
  },
  sim: {
    eyebrow: 'ROI Simulator',
    h2: 'How much are you losing?',
    sub: 'Calculate the unexpressed revenue potential of your venue.',
    label: 'Monthly Visitors',
    placeholder: 'e.g. 5000',
    note: 'Calculation based on 23% average conversion and €10 ticket.',
    resultLabel: 'Potential monthly revenue',
    resultSub: 'These are funds you are leaving on the table today due to queues and lack of multilinguality.',
    cta: 'Recover this revenue now →',
    empty: 'Enter the number of visitors to see the calculation'
  },
  pricing: {
    eyebrow: 'Transparent Pricing',
    h2: 'We only grow if you grow.',
    sub: 'No fixed costs. No hardware to buy. Only a commission on sales.',
    priceLead: 'Example on a €10 ticket:',
    example: { gross: '€ 10.00', feeLabel: 'QRGate Commission', fee: '€ 0.99', netLabel: 'Your net income', net: '€ 9.01' },
    included: 'Always included in the price:',
    items: [
      'Unlimited Scanner App', 'Aria AI Audioguide (Revenue Share)', '24/7 Customer Support', 'All payment methods'
    ],
    cta: 'Activate now without card →',
    risk: 'No commitment. Cancel anytime.',
    altTitle: 'Traditional Systems Cost',
    altItems: ['Hardware installation', 'Annual maintenance', 'Fixed monthly fee', 'Local staff training']
  },
  social: {
    eyebrow: 'What they say',
    h2: 'Real testimonials.',
    items: [
      { stars: 5, quote: 'We reduced lines by 90% in the first month. Tourists love not having to download apps.', name: 'Marco R.', role: 'Museum Curator', metric: '+124% Sales' },
      { stars: 5, quote: 'Aria Guide is incredible. Japanese and Chinese visitors finally understand our history.', name: 'Elena V.', role: 'Education Manager', metric: '+35% Revenue' },
      { stars: 5, quote: 'Setup in one morning. I didn\'t think it was possible to digitalise a castle so quickly.', name: 'Giuseppe T.', role: 'Historic Home Owner', metric: 'Live in 3h' }
    ]
  },
  faq: {
    eyebrow: 'Frequently Asked Questions',
    h2: 'Doubts? Here are the answers.',
    items: [
      { q: 'Do I need internet to scan?', a: 'No, the scanner app works offline and syncs data as soon as the signal returns.' },
      { q: 'How do I receive payments?', a: 'You receive funds directly on your IBAN via Stripe. Settlement happens every 24-48 hours.' },
      { q: 'Can I use QRGate with my current system?', a: 'Absolutely. Many of our clients use QRGate only for lines or Aria audioguides.' }
    ]
  },
  cta: {
    eyebrow: 'Ready to start?',
    h2: 'The future of your venue is one QR Code away.',
    sub: 'Activate QRGate today. Receive first payments tomorrow. Zero risks, everything to gain.',
    cta1: 'Start Now Free',
    cta2: 'Book a Demo',
    micro: 'No credit card required · 10-minute setup'
  }
};

const COPY = {
  it: COPY_IT,
  en: COPY_EN,
  de: {
    ...COPY_EN,
    hero: {
      ...COPY_EN.hero,
      eyebrow: 'Das System, das Ihre Konkurrenten morgen nutzen werden. Sie nutzen es heute.',
      h1a: 'Jede Warteminute ist ein',
      h1b: 'Besucher, der geht.',
      sub: 'QRGate verwandelt Ihren Eingang in eine automatische Einnahmemaschine. Der Besucher scannt, zahlt in 15 Sekunden, tritt ein. Die Gelder gehen auf Ihr Konto — kein Bargeld, keine Hardware, keine Einarbeitung.',
      cta1: 'Museum kostenlos aktivieren',
      cta2: '3-Minuten-Demo ansehen',
      badge1: 'Keine Hardware',
      badge2: 'In 24 Stunden aktiv',
      badge3: 'DSGVO-zertifiziert'
    },
    announcement: { pre: 'Europa-Einführungsangebot:', bold: '3% Festprovision', post: 'für die ersten 50 Museen', cta: 'Platz reservieren →' },
    cta: {
      ...COPY_EN.cta,
      h2: 'Ihre Konkurrenten aktivieren sich bereits.',
      cta1: 'Ihr Museum jetzt aktivieren',
      cta2: '30-minütige Demo buchen'
    }
  },
  fr: {
    ...COPY_EN,
    hero: {
      ...COPY_EN.hero,
      eyebrow: 'Le système que vos concurrents utiliseront demain. Vous l\'utilisez aujourd\'hui.',
      h1a: 'Chaque minute de file',
      h1b: 'est un visiteur qui s\'en va.',
      sub: 'QRGate transforme votre entrée en machine à revenus automatique. Le visiteur scanne, paie en 15 secondes, entre. Les fonds arrivent sur votre compte — sans espèces, sans matériel, sans formation.',
      cta1: 'Activer votre musée gratuitement',
      cta2: 'Voir la démo de 3 minutes',
      badge1: 'Zéro matériel',
      badge2: 'Actif en 24 heures',
      badge3: 'Certifié RGPD'
    },
    announcement: { pre: 'Offre de lancement Europe:', bold: 'Commission fixe 3%', post: 'pour les 50 premiers musées', cta: 'Réserver votre place →' }
  },
  es: {
    ...COPY_EN,
    hero: {
      ...COPY_EN.hero,
      eyebrow: 'El sistema que tus competidores usarán mañana. Tú lo usas hoy.',
      h1a: 'Cada minuto de cola',
      h1b: 'el visitante che va via.',
      sub: 'QRGate convierte tu entrada en una máquina de ingresos automática. El visitante escanea, paga en 15 segundos, entra. Los fondos llegan a tu cuenta — sin efectivo, sin hardware, sin formación.',
      cta1: 'Activa tu museo gratis',
      cta2: 'Ver demo de 3 minutos',
      badge1: 'Cero hardware',
      badge2: 'Activo en 24 horas',
      badge3: 'Certificado GDPR'
    },
    announcement: { pre: 'Oferta de lanzamiento Europa:', bold: 'Comisión fija 3%', post: 'para los primeros 50 museos', cta: 'Reservar tu lugar →' }
  },
  nl: {
    ...COPY_EN,
    hero: {
      ...COPY_EN.hero,
      eyebrow: 'Het systeem dat uw concurrenten morgen zullen gebruiken. U gebruikt het vandaag.',
      h1a: 'Elke wachtminuut is een',
      h1b: 'bezoeker die vertrekt.',
      sub: 'QRGate transformeert uw ingang in een automatische inkomstenmachine. De bezoeker scant, betaalt in 15 seconden, gaat naar binnen. Fondsen gaan naar uw rekening — geen contant geld, geen hardware, geen opleiding.',
      cta1: 'Activeer uw museum gratis',
      badge3: 'AVG-gecertificeerd'
    },
    announcement: { pre: 'Europa Lancering Aanbieding:', bold: 'Vaste 3% commissie', post: 'voor de eerste 50 musea', cta: 'Reserveer je plek →' }
  },
  pt: {
    ...COPY_EN,
    hero: {
      ...COPY_EN.hero,
      eyebrow: 'O sistema que os seus concorrentes usarão amanhã. Você usa hoje.',
      h1a: 'Cada minuto de fila',
      h1b: 'é um visitante che va via.',
      sub: 'O QRGate transforma a sua entrada numa macchina de receitas automática. O visitante escaneia, paga em 15 segundos, entra. Os fundos chegam à sua conta — sem dinheiro, sem hardware, sem formação.',
      cta1: 'Ativar o seu museu grátis',
      cta2: 'Ver demo de 3 minuti',
      badge1: 'Zero hardware',
      badge2: 'Ativo em 24 ore',
      badge3: 'Certificato RGPD'
    },
    announcement: { pre: 'Oferta de Lançamento na Europa:', bold: 'Comissão fixa de 3%', post: 'para os primi 50 musei', cta: 'Reserve o seu lugar →' }
  }
};

/* ────────────────────────────────────────────────────────
   MAIN COMPONENT
──────────────────────────────────────────────────────── */
const Homepage = () => {
  const { i18n } = useTranslation();
  const lang = i18n.language?.substring(0, 2) || 'it';
  const c = COPY[lang] || COPY['en'] || COPY['it'];

  const [liveSales, setLiveSales] = useState(1247);
  const [activeVenues, setActiveVenues] = useState(214);
  const [monthlyVisitors, setMonthlyVisitors] = useState('');
  const [lostRevenue, setLostRevenue] = useState(null);

  // Live counters — credible slow increment
  useEffect(() => {
    const id = setInterval(() => {
      setLiveSales(p => p + (Math.random() > 0.65 ? 1 : 0));
      if (Math.random() > 0.995) setActiveVenues(p => p + 1);
    }, 3800);
    return () => clearInterval(id);
  }, []);

  // ROI simulator
  useEffect(() => {
    const v = parseInt(monthlyVisitors) || 0;
    if (v > 0) {
      setLostRevenue(Math.round((v / 4) * 10 * 0.23));
      const t = setTimeout(() => analytics.trackSimulatorUsed(v, 10), 800);
      return () => clearTimeout(t);
    }
    setLostRevenue(null);
  }, [monthlyVisitors]);

  return (
    <div className="min-h-screen overflow-x-hidden" style={{ background: '#F5F2EC', fontFamily: "'DM Sans', -apple-system, sans-serif" }}>

      {/* ══ ANNOUNCEMENT BAR ═══════════════════════════════════════ */}
      <div className="bg-stone-950 text-stone-200 px-4 py-2.5 flex items-center justify-center gap-3 text-xs sm:text-sm">
        <span className="flex items-center gap-1.5">
          <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse shrink-0" />
          {c.announcement.pre} <strong className="text-white mx-1">{c.announcement.bold}</strong> {c.announcement.post}
        </span>
        <span className="text-stone-400 hidden sm:inline">·</span>
        <Link to="/onboarding" className="text-amber-400 font-semibold hover:text-amber-300 transition-colors underline underline-offset-2 hidden sm:inline">
          {c.announcement.cta}
        </Link>
      </div>

      <Navbar />

      {/* ══ HERO ═══════════════════════════════════════════════════ */}
      <section className="relative pt-16 pb-20 lg:pt-24 lg:pb-28 px-4 sm:px-6 lg:px-8 overflow-hidden">
        {/* Ambient light */}
        <div className="absolute -top-40 left-1/4 w-[700px] h-[600px] bg-amber-100/50 blur-[130px] rounded-full pointer-events-none" />
        <div className="absolute top-20 right-0 w-[400px] h-[400px] bg-blue-100/30 blur-[100px] rounded-full pointer-events-none" />

        <div className="max-w-7xl mx-auto relative z-10">
          <div className="grid lg:grid-cols-[1fr_480px] gap-12 lg:gap-16 xl:gap-24 items-center">

            {/* LEFT — The Argument */}
            <motion.div variants={stagger} initial="hidden" animate="visible" className="max-w-2xl">

              <motion.p variants={fadeUp} className="text-xs sm:text-sm font-bold text-amber-700 tracking-widest uppercase mb-5">
                {c.hero.eyebrow}
              </motion.p>

              <motion.h1 variants={fadeUp} className="text-5xl sm:text-6xl xl:text-7xl font-black text-stone-950 leading-[1.02] tracking-tight mb-6">
                {c.hero.h1a}<br />
                <span className="relative inline-block">
                  <span className="relative z-10">{c.hero.h1b}</span>
                  <span className="absolute bottom-1 left-0 right-0 h-3 bg-amber-300/40 -rotate-1 -z-0" />
                </span>
              </motion.h1>

              <motion.p variants={fadeUp} className="text-lg sm:text-xl text-stone-500 leading-relaxed mb-10 max-w-xl">
                {c.hero.sub}
              </motion.p>

              <motion.div variants={fadeUp} className="flex flex-col sm:flex-row gap-3 mb-10">
                <Link to="/onboarding"
                  className="inline-flex items-center justify-center gap-2 px-7 py-4 bg-stone-950 text-white rounded-xl font-bold text-base hover:bg-stone-800 active:scale-[0.98] transition-all shadow-lg shadow-stone-950/15">
                  {c.hero.cta1} <ArrowRight className="w-4 h-4" />
                </Link>
                <a href="https://calendly.com/qrgate-demo" target="_blank" rel="noopener noreferrer"
                  className="inline-flex items-center justify-center gap-2 px-7 py-4 bg-white text-stone-700 border border-stone-200 rounded-xl font-semibold text-base hover:bg-stone-50 hover:border-stone-300 active:scale-[0.98] transition-all">
                  <PlayCircle className="w-4 h-4 text-stone-400" /> {c.hero.cta2}
                </a>
              </motion.div>

              {/* Badges */}
              <motion.div variants={fadeUp} className="flex flex-wrap gap-2.5 mb-10">
                {[
                  { icon: Zap, label: c.hero.badge1, color: 'text-amber-600' },
                  { icon: CheckCircle, label: c.hero.badge2, color: 'text-emerald-600' },
                  { icon: Shield, label: c.hero.badge3, color: 'text-blue-600' },
                ].map((b, i) => (
                  <span key={i} className="flex items-center gap-1.5 px-3 py-1.5 bg-white border border-stone-200 rounded-full text-xs font-semibold text-stone-700 shadow-sm">
                    <b.icon className={`w-3.5 h-3.5 ${b.color}`} /> {b.label}
                  </span>
                ))}
              </motion.div>

              {/* Live social proof */}
              <motion.div variants={fadeUp} className="flex flex-wrap gap-4 pt-6 border-t border-stone-200">
                <div className="flex items-center gap-2">
                  <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                  <span className="text-sm font-black text-stone-900 tabular-nums">{liveSales.toLocaleString('it-IT')}</span>
                  <span className="text-sm text-stone-500">{c.hero.social1}</span>
                </div>
                <div className="text-stone-300 hidden sm:block">|</div>
                <div className="flex items-center gap-2">
                  <Activity className="w-4 h-4 text-blue-500" />
                  <span className="text-sm font-black text-stone-900 tabular-nums">{activeVenues}</span>
                  <span className="text-sm text-stone-500">{c.hero.social2}</span>
                </div>
                <div className="text-stone-300 hidden sm:block">|</div>
                <div className="flex items-center gap-2">
                  <Euro className="w-4 h-4 text-amber-500" />
                  <span className="text-sm font-black text-stone-900">5% + €0,49</span>
                  <span className="text-sm text-stone-500">{c.hero.social3}</span>
                </div>
              </motion.div>
            </motion.div>

            {/* RIGHT — Product Preview Card */}
            <motion.div
              initial={{ opacity: 0, y: 36, scale: 0.95 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              transition={{ duration: 1.0, ease, delay: 0.15 }}
              className="relative"
            >
              {/* Main card */}
              <div className="bg-white rounded-2xl border border-stone-200/80 shadow-2xl shadow-stone-950/10 overflow-hidden">
                {/* Browser chrome */}
                <div className="flex items-center gap-2.5 px-4 py-3 bg-stone-50 border-b border-stone-100">
                  <div className="flex gap-1.5">{[0, 1, 2].map(i => <div key={i} className="w-2.5 h-2.5 rounded-full bg-stone-200" />)}</div>
                  <div className="flex-1 text-center">
                    <span className="text-[11px] font-mono text-stone-400 bg-white border border-stone-200 px-3 py-0.5 rounded-md inline-block">dashboard.qrgate.com/museo-civico-brescia</span>
                  </div>
                </div>

                <div className="p-5 space-y-4">
                  {/* Header */}
                  <div className="flex items-center justify-between">
                    <div>
                      <h4 className="text-sm font-bold text-stone-900">Museo Civico · {lang === 'it' ? 'Oggi' : 'Today'}</h4>
                      <p className="text-xs text-stone-400">{lang === 'it' ? 'Lunedì 2 marzo 2026' : 'Monday 2 March 2026'}</p>
                    </div>
                    <span className="flex items-center gap-1.5 text-[10px] font-bold text-emerald-700 bg-emerald-50 border border-emerald-100 px-2.5 py-1 rounded-full">
                      <span className="w-1.5 h-1.5 bg-emerald-500 rounded-full animate-pulse" /> Live
                    </span>
                  </div>

                  {/* KPIs */}
                  <div className="grid grid-cols-3 gap-2.5">
                    {[
                      { l: lang === 'it' ? 'Incassi oggi' : 'Today\'s revenue', v: '€ 1.840', ch: '+24%', up: true },
                      { l: lang === 'it' ? 'Biglietti' : 'Tickets', v: '127', ch: '+11%', up: true },
                      { l: 'Scan rate', v: '99.2%', ch: '↑', up: true },
                    ].map((k, i) => (
                      <div key={i} className="bg-stone-50 border border-stone-100 rounded-xl p-3">
                        <p className="text-[9px] font-semibold text-stone-400 uppercase tracking-wider mb-1.5">{k.l}</p>
                        <p className="text-base font-black text-stone-900 tabular-nums leading-none">{k.v}</p>
                        <span className="inline-block mt-1.5 text-[9px] font-bold text-emerald-700 bg-emerald-50 px-1.5 py-0.5 rounded-full">{k.ch}</span>
                      </div>
                    ))}
                  </div>

                  {/* Sparkline chart */}
                  <div className="bg-stone-50 border border-stone-100 rounded-xl p-3.5">
                    <p className="text-[9px] font-semibold text-stone-400 uppercase tracking-wider mb-3">{lang === 'it' ? 'Vendite settimanali' : 'Weekly sales'}</p>
                    <div className="flex items-end gap-1 h-12">
                      {[28, 44, 36, 68, 52, 81, 58, 91, 62, 78, 45, 100].map((h, i) => (
                        <div key={i} className="flex-1 rounded-t transition-all duration-700"
                          style={{ height: `${h}%`, background: i === 11 ? '#1C1917' : i >= 9 ? '#D6D0C8' : '#EAE7E0' }} />
                      ))}
                    </div>
                  </div>

                  {/* Recent entries — most powerful proof */}
                  <div>
                    <p className="text-[9px] font-semibold text-stone-400 uppercase tracking-wider mb-2">{lang === 'it' ? 'Ultimi ingressi' : 'Latest entries'}</p>
                    <div className="space-y-1.5">
                      {[
                        { flag: '🇩🇪', name: 'H. Müller', time: '11:42', amount: '€ 14', method: 'Apple Pay' },
                        { flag: '🇯🇵', name: 'Y. Tanaka', time: '11:39', amount: '€ 14', method: 'Google Pay' },
                        { flag: '🇺🇸', name: 'K. Johnson', time: '11:35', amount: '€ 22', method: 'Visa' },
                      ].map((e, i) => (
                        <div key={i} className="flex items-center justify-between py-1.5 px-2.5 rounded-lg hover:bg-stone-50 transition-colors">
                          <div className="flex items-center gap-2">
                            <span className="text-sm">{e.flag}</span>
                            <span className="text-xs font-medium text-stone-700">{e.name}</span>
                            <span className="text-[9px] text-stone-300 font-mono">{e.time}</span>
                          </div>
                          <div className="flex items-center gap-2">
                            <span className="text-[9px] text-stone-400">{e.method}</span>
                            <span className="text-xs font-black text-stone-900 tabular-nums">{e.amount}</span>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              </div>

              {/* Floating notification */}
              <motion.div
                initial={{ opacity: 0, x: 24, y: 10 }}
                animate={{ opacity: 1, x: 0, y: 0 }}
                transition={{ delay: 1.4, duration: 0.6, ease }}
                className="absolute -right-4 top-20 bg-white border border-stone-200 rounded-xl px-4 py-3 shadow-xl flex items-center gap-3 max-w-[220px]"
              >
                <div className="w-8 h-8 bg-emerald-100 rounded-lg flex items-center justify-center shrink-0">
                  <CheckCircle className="w-4 h-4 text-emerald-600" />
                </div>
                <div>
                  <p className="text-xs font-bold text-stone-900">{lang === 'it' ? 'Nuovo biglietto' : 'New ticket'}</p>
                  <p className="text-[10px] text-stone-500">🇫🇷 Marie D. · €18 · Visa</p>
                </div>
              </motion.div>

              <motion.div
                initial={{ opacity: 0, x: -24 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: 1.8, duration: 0.6, ease }}
                className="absolute -left-4 bottom-16 bg-stone-950 text-white rounded-xl px-4 py-2.5 shadow-xl flex items-center gap-2"
              >
                <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
                <span className="text-xs font-bold">IBAN: +€ 1.101 {lang === 'it' ? 'in arrivo' : 'incoming'}</span>
              </motion.div>
            </motion.div>

          </div>
        </div>
      </section>

      {/* ══ TRUSTED BY (Marquee) ═══════════════════════════════════ */}
      <section className="bg-white border-y border-stone-200 py-8 overflow-hidden">
        <p className="text-center text-[10px] font-bold text-stone-400 uppercase tracking-[0.15em] mb-5">
          {lang === 'it' ? 'Scelto da strutture culturali in tutta Europa' : 'Chosen by cultural venues across Europe'}
        </p>
        <div className="relative flex overflow-hidden">
          {[0, 1].map(idx => (
            <div key={idx} className={`flex shrink-0 gap-16 sm:gap-20 px-10 items-center ${idx === 0 ? 'animate-marquee' : 'animate-marquee2 absolute top-0 left-0'}`}>
              {['Museo Civico Brescia', 'Duomo di Milano', 'Terme di Caracalla', 'Galleria Borghese Roma', 'Castello Sforzesco', 'Palazzo Ducale Venezia', 'Uffizi Firenze', 'Colosseo Roma'].map((n, i) => (
                <div key={i} className="flex items-center gap-2 text-stone-300 hover:text-stone-600 transition-colors duration-300 whitespace-nowrap cursor-default">
                  <Building2 className="w-4 h-4 shrink-0" />
                  <span className="text-xs font-bold tracking-tight">{n}</span>
                </div>
              ))}
            </div>
          ))}
          <div className="absolute inset-y-0 left-0 w-24 bg-gradient-to-r from-white to-transparent z-10 pointer-events-none" />
          <div className="absolute inset-y-0 right-0 w-24 bg-gradient-to-l from-white to-transparent z-10 pointer-events-none" />
        </div>
      </section>

      {/* ══ PAIN SECTION ═══════════════════════════════════════════ */}
      <section className="py-24 lg:py-32 px-4 sm:px-6 lg:px-8" style={{ background: '#F5F2EC' }}>
        <div className="max-w-7xl mx-auto">
          <SceneIn className="mb-16 text-center">
            <p className="text-xs font-bold text-red-600 uppercase tracking-widest mb-3">{c.pain.eyebrow}</p>
            <h2 className="text-4xl sm:text-5xl font-black text-stone-950 tracking-tight mb-4 max-w-3xl mx-auto">{c.pain.h2}</h2>
            <p className="text-stone-500 text-lg max-w-xl mx-auto">{c.pain.sub}</p>
          </SceneIn>

          <motion.div
            variants={stagger} initial="hidden" whileInView="visible" viewport={{ once: true, margin: '-60px' }}
            className="grid sm:grid-cols-2 lg:grid-cols-4 gap-5 mb-16"
          >
            {[
              { n: c.pain.stat1n, l: c.pain.stat1l, color: 'text-red-500', bg: 'bg-red-50 border-red-100' },
              { n: c.pain.stat2n, l: c.pain.stat2l, color: 'text-orange-500', bg: 'bg-orange-50 border-orange-100' },
              { n: c.pain.stat3n, l: c.pain.stat3l, color: 'text-red-500', bg: 'bg-red-50 border-red-100' },
              { n: c.pain.stat4n, l: c.pain.stat4l, color: 'text-emerald-600', bg: 'bg-emerald-50 border-emerald-100' },
            ].map((s, i) => (
              <motion.div key={i} variants={fadeUp} className={`border rounded-2xl p-7 ${s.bg}`}>
                <p className={`text-5xl font-black tabular-nums mb-3 ${s.color}`}>{s.n}</p>
                <p className="text-stone-600 text-sm leading-relaxed font-medium">{s.l}</p>
              </motion.div>
            ))}
          </motion.div>

          <SceneIn className="bg-stone-950 text-white rounded-2xl p-8 sm:p-12 text-center">
            <blockquote className="text-xl sm:text-2xl font-medium italic text-stone-200 mb-4 max-w-3xl mx-auto leading-relaxed">
              {c.pain.insight}
            </blockquote>
            <p className="text-stone-500 text-sm font-semibold">{c.pain.insightRole}</p>
          </SceneIn>
        </div>
      </section>

      {/* ══ COMPETITOR TABLE ═══════════════════════════════════════ */}
      <section className="py-24 lg:py-32 px-4 sm:px-6 lg:px-8 bg-white">
        <div className="max-w-5xl mx-auto">
          <SceneIn className="text-center mb-14">
            <p className="text-xs font-bold text-amber-600 uppercase tracking-widest mb-3">{c.competitors.eyebrow}</p>
            <h2 className="text-4xl sm:text-5xl font-black text-stone-950 tracking-tight mb-4">{c.competitors.h2}</h2>
            <p className="text-stone-500 text-lg max-w-2xl mx-auto">{c.competitors.sub}</p>
          </SceneIn>

          <SceneIn>
            <div className="overflow-hidden rounded-2xl border border-stone-200 shadow-lg">
              <table className="w-full text-sm">
                <thead>
                  <tr>
                    <th className="bg-stone-50 text-left px-6 py-4 font-semibold text-stone-500 text-xs uppercase tracking-wider w-1/3 border-b border-stone-200"></th>
                    <th className="bg-stone-50 text-center px-6 py-4 border-b border-stone-200">
                      <span className="text-xs font-bold text-stone-400 uppercase tracking-wider">{c.competitors.col1}</span>
                    </th>
                    <th className="bg-stone-950 text-center px-6 py-4 border-b border-stone-800">
                      <span className="flex items-center justify-center gap-2">
                        <QrCode className="w-4 h-4 text-amber-400" />
                        <span className="text-sm font-black text-white">QRGate</span>
                      </span>
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {c.competitors.rows.map(([label, old, next], i) => (
                    <tr key={i} className={i % 2 === 0 ? 'bg-white' : 'bg-stone-50/50'}>
                      <td className="px-6 py-4 font-semibold text-stone-700 text-xs uppercase tracking-wide border-r border-stone-100">{label}</td>
                      <td className="px-6 py-4 text-center text-stone-400 text-sm border-r border-stone-100">{old}</td>
                      <td className="px-6 py-4 text-center text-sm font-semibold text-white bg-stone-950/95">
                        <span className="text-emerald-400">{next}</span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </SceneIn>
        </div>
      </section>

      {/* ══ HOW IT WORKS ═══════════════════════════════════════════ */}
      <section id="how-it-works" className="py-24 lg:py-32 px-4 sm:px-6 lg:px-8" style={{ background: '#F5F2EC' }}>
        <div className="max-w-7xl mx-auto">
          <SceneIn className="text-center mb-16">
            <p className="text-xs font-bold text-amber-600 uppercase tracking-widest mb-3">{c.howItworks.eyebrow}</p>
            <h2 className="text-4xl sm:text-5xl font-black text-stone-950 tracking-tight mb-4">{c.howItworks.h2}</h2>
            <p className="text-stone-500 text-lg max-w-2xl mx-auto">{c.howItworks.sub}</p>
          </SceneIn>

          <motion.div variants={stagger} initial="hidden" whileInView="visible" viewport={{ once: true, margin: '-60px' }} className="grid md:grid-cols-3 gap-6">
            {c.howItworks.steps.map((s, i) => (
              <motion.div key={i} variants={fadeUp} className="group bg-white border border-stone-200 rounded-2xl p-8 hover:shadow-xl hover:-translate-y-1 transition-all duration-300">
                <div className="flex items-start justify-between mb-7">
                  <div className={`w-12 h-12 border rounded-xl flex items-center justify-center ${s.accent}`}>
                    <s.icon className="w-6 h-6" />
                  </div>
                  <span className="text-5xl font-black text-stone-100 tabular-nums leading-none">{s.n}</span>
                </div>
                <h3 className="text-base font-bold text-stone-900 mb-3 leading-snug">{s.title}</h3>
                <p className="text-stone-500 text-sm leading-relaxed mb-5">{s.desc}</p>
                <span className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-stone-100 rounded-full text-xs font-semibold text-stone-600">
                  <CheckCircle className="w-3.5 h-3.5 text-emerald-500" /> {s.tag}
                </span>
              </motion.div>
            ))}
          </motion.div>
        </div>
      </section>

      {/* ══ FEATURES GRID ══════════════════════════════════════════ */}
      <section className="py-24 lg:py-32 px-4 sm:px-6 lg:px-8 bg-white">
        <div className="max-w-7xl mx-auto">
          <SceneIn className="mb-16">
            <div className="flex flex-col lg:flex-row lg:items-end gap-6 justify-between">
              <div>
                <p className="text-xs font-bold text-amber-600 uppercase tracking-widest mb-3">{c.features.eyebrow}</p>
                <h2 className="text-4xl sm:text-5xl font-black text-stone-950 tracking-tight">{c.features.h2}</h2>
              </div>
              <p className="text-stone-500 text-base max-w-sm lg:text-right leading-relaxed">{c.features.sub}</p>
            </div>
          </SceneIn>

          <motion.div variants={stagger} initial="hidden" whileInView="visible" viewport={{ once: true, margin: '-60px' }} className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {c.features.items.map((f, i) => (
              <motion.div key={i} variants={fadeUp}
                className="group border border-stone-200 bg-white rounded-2xl p-6 hover:border-stone-400 hover:shadow-lg hover:-translate-y-0.5 transition-all duration-250">
                <div className="w-10 h-10 bg-stone-100 group-hover:bg-stone-950 rounded-xl flex items-center justify-center mb-5 transition-all duration-250">
                  <f.icon className="w-5 h-5 text-stone-600 group-hover:text-white transition-colors duration-250" />
                </div>
                <h3 className="font-bold text-stone-900 mb-1.5 text-sm">{f.title}</h3>
                <p className="text-stone-500 text-sm leading-relaxed mb-4">{f.desc}</p>
                <span className="text-[10px] font-bold text-amber-700 uppercase tracking-widest">{f.tag}</span>
              </motion.div>
            ))}
          </motion.div>
        </div>
      </section>

      {/* ── NO WEBSITE SECTION ── */}
      <section className="py-24 lg:py-32" style={{ background: '#0F0E0C' }}>
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <SceneIn className="text-center mb-16">
            <span className="inline-block px-4 py-1.5 rounded-full border border-amber-500/30 text-amber-400 text-xs font-black uppercase tracking-widest mb-5">
              {c.noWebsite.eyebrow}
            </span>
            <h2 className="text-3xl sm:text-4xl lg:text-5xl font-black text-white tracking-tight mb-5">
              {c.noWebsite.h2}
            </h2>
            <p className="text-stone-400 text-lg max-w-2xl mx-auto leading-relaxed">
              {c.noWebsite.sub}
            </p>
          </SceneIn>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-16">
            {c.noWebsite.items.map((item, i) => {
              const iconMap = { Globe, QrCode, Share2, Search };
              const Icon = iconMap[item.icon] || Globe;
              return (
                <SceneIn key={i} delay={i * 0.1}>
                  <div className="bg-stone-900 border border-stone-800 rounded-2xl p-7 flex gap-5 hover:border-stone-600 transition-colors">
                    <div className="w-12 h-12 bg-amber-500/10 border border-amber-500/20 rounded-xl flex items-center justify-center shrink-0">
                      <Icon className="w-6 h-6 text-amber-400" />
                    </div>
                    <div>
                      <h3 className="font-black text-white text-base mb-1.5">{item.title}</h3>
                      <p className="text-stone-400 text-sm leading-relaxed">{item.desc}</p>
                    </div>
                  </div>
                </SceneIn>
              );
            })}
          </div>

          {/* Mock page preview */}
          <SceneIn className="flex flex-col items-center">
            <p className="text-stone-500 text-xs font-semibold uppercase tracking-widest mb-6">
              {c.noWebsite.example.label}
            </p>
            <div className="w-full max-w-sm bg-stone-900 rounded-3xl border border-stone-700 overflow-hidden shadow-2xl">
              {/* Fake browser bar */}
              <div className="flex items-center gap-2 px-4 py-3 border-b border-stone-700 bg-stone-800">
                <div className="flex gap-1.5">
                  <div className="w-3 h-3 rounded-full bg-stone-600" />
                  <div className="w-3 h-3 rounded-full bg-stone-600" />
                  <div className="w-3 h-3 rounded-full bg-stone-600" />
                </div>
                <div className="flex-1 bg-stone-700 rounded-full px-3 py-1 text-xs text-stone-400 font-mono">
                  {c.noWebsite.example.url}
                </div>
              </div>
              {/* Fake venue card */}
              <div className="p-5">
                <div className="h-24 bg-gradient-to-br from-stone-700 to-stone-600 rounded-xl mb-4 flex items-end p-3">
                  <div className="w-12 h-12 bg-amber-400 rounded-xl shadow-lg" />
                </div>
                <div className="h-5 bg-stone-700 rounded-full w-3/4 mb-2" />
                <div className="h-3 bg-stone-800 rounded-full w-full mb-1" />
                <div className="h-3 bg-stone-800 rounded-full w-2/3 mb-5" />
                <div className="bg-stone-800 rounded-xl p-4 mb-3 flex justify-between items-center">
                  <div>
                    <div className="h-3 bg-stone-600 rounded w-24 mb-1" />
                    <div className="h-4 bg-stone-500 rounded w-16" />
                  </div>
                  <div className="h-4 bg-stone-600 rounded w-12" />
                </div>
                <div className="w-full h-11 bg-amber-500 rounded-xl flex items-center justify-center">
                  <div className="h-3 bg-amber-300/50 rounded w-24" />
                </div>
              </div>
            </div>
            <Link
              to="/onboarding"
              className="mt-8 inline-flex items-center gap-2 px-7 py-4 bg-amber-500 text-stone-950 rounded-xl font-black text-sm hover:bg-amber-400 transition-all"
            >
              {c.noWebsite.cta}
            </Link>
          </SceneIn>
        </div>
      </section>

      {/* ── ARIA GUIDE SECTION ── */}
      <section id="aria-guide" className="py-24 lg:py-32 bg-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid lg:grid-cols-2 gap-16 items-center">

            {/* LEFT — Copy */}
            <SceneIn>
              <span className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full border border-amber-300 bg-amber-50 text-amber-700 text-xs font-black uppercase tracking-widest mb-6">
                <Smartphone className="w-3.5 h-3.5" />
                {c.aria.eyebrow}
              </span>
              <h2 className="text-3xl sm:text-4xl lg:text-5xl font-black text-stone-950 tracking-tight mb-5 leading-tight">
                {c.aria.h2}
              </h2>
              <p className="text-stone-500 text-lg leading-relaxed mb-10">
                {c.aria.sub}
              </p>

              {/* Features list */}
              <div className="space-y-5 mb-10">
                {c.aria.features.map((f, i) => (
                  <div key={i} className="flex items-start gap-4">
                    <span className="w-8 h-8 bg-stone-950 text-white rounded-lg flex items-center justify-center text-xs font-black shrink-0 mt-0.5">
                      {f.n}
                    </span>
                    <div>
                      <p className="font-black text-stone-950 text-sm mb-0.5">{f.title}</p>
                      <p className="text-stone-500 text-sm leading-relaxed">{f.desc}</p>
                    </div>
                  </div>
                ))}
              </div>

              {/* Revenue badge */}
              <div className="inline-flex items-center gap-3 bg-emerald-50 border border-emerald-200 rounded-xl px-5 py-3 mb-8">
                <TrendingUp className="w-5 h-5 text-emerald-600 shrink-0" />
                <span className="font-black text-emerald-800 text-sm">{c.aria.badge}</span>
              </div>

              <div className="flex flex-col sm:flex-row items-start gap-4">
                <Link
                  to="/onboarding"
                  className="inline-flex items-center gap-2 px-7 py-4 bg-stone-950 text-white rounded-xl font-black text-sm hover:bg-stone-800 transition-all"
                >
                  {c.aria.cta} <ArrowRight className="w-4 h-4" />
                </Link>
                <p className="text-stone-400 text-xs leading-relaxed self-center max-w-xs">
                  {c.aria.note}
                </p>
              </div>
            </SceneIn>

            {/* RIGHT — Language pills + mock phone */}
            <SceneIn delay={0.15} className="flex flex-col items-center">
              {/* Language pills */}
              <div className="flex flex-wrap gap-2 justify-center mb-8 max-w-sm">
                {c.aria.languages.map((lang, i) => (
                  <span
                    key={i}
                    className={`px-3 py-1.5 rounded-full text-xs font-black border ${i < 8
                      ? 'bg-stone-950 text-white border-stone-800'
                      : i === c.aria.languages.length - 1
                        ? 'bg-amber-500 text-stone-950 border-amber-400'
                        : 'bg-stone-100 text-stone-600 border-stone-200'
                      }`}
                  >
                    {lang}
                  </span>
                ))}
              </div>

              {/* Mock phone UI */}
              <div className="w-64 bg-stone-950 rounded-3xl border-4 border-stone-700 overflow-hidden shadow-2xl">
                {/* Status bar */}
                <div className="flex justify-between items-center px-5 py-2 text-[10px] text-stone-500">
                  <span>9:41</span>
                  <div className="flex gap-1">
                    <div className="w-4 h-2 bg-stone-600 rounded-sm" />
                  </div>
                </div>
                {/* Header */}
                <div className="px-4 pb-4 border-b border-stone-800">
                  <div className="flex items-center gap-3 mb-1">
                    <div className="w-8 h-8 bg-amber-500 rounded-lg flex items-center justify-center">
                      <Smartphone className="w-4 h-4 text-stone-950" />
                    </div>
                    <div>
                      <p className="text-white font-black text-xs">Aria Guide</p>
                      <p className="text-stone-500 text-[10px]">Galleria Nazionale d'Arte</p>
                    </div>
                  </div>
                </div>
                {/* Audio player mock */}
                <div className="px-4 py-5">
                  {/* Artwork */}
                  <div className="h-28 bg-stone-800 rounded-xl mb-4 relative overflow-hidden">
                    <div className="absolute inset-0 bg-gradient-to-br from-amber-900/30 to-stone-900/50" />
                    <div className="absolute bottom-2 left-2 right-2">
                      <div className="h-2 bg-stone-600 rounded-full mb-1" />
                      <div className="h-2 bg-stone-600 rounded-full w-3/4" />
                    </div>
                  </div>
                  {/* Track info */}
                  <p className="text-white font-black text-xs mb-0.5">Sala Caravaggio — Opera 3</p>
                  <p className="text-stone-500 text-[10px] mb-4">La Vocazione di San Matteo · 4:32</p>
                  {/* Progress bar */}
                  <div className="h-1 bg-stone-700 rounded-full mb-3">
                    <div className="h-1 bg-amber-400 rounded-full w-2/5" />
                  </div>
                  {/* Controls */}
                  <div className="flex items-center justify-between px-4">
                    <div className="w-6 h-6 bg-stone-700 rounded-full" />
                    <div className="w-10 h-10 bg-amber-500 rounded-full flex items-center justify-center">
                      <div className="w-3 h-3 border-l-4 border-l-stone-950 border-t-2 border-b-2 border-transparent ml-1" />
                    </div>
                    <div className="w-6 h-6 bg-stone-700 rounded-full" />
                  </div>
                </div>
                {/* Language selector */}
                <div className="px-4 pb-4 flex gap-2">
                  {['IT', 'EN', 'DE', 'FR', 'ES'].map((l, i) => (
                    <span key={i} className={`px-2 py-1 rounded-lg text-[10px] font-black ${i === 0 ? 'bg-amber-500 text-stone-950' : 'bg-stone-800 text-stone-500'}`}>
                      {l}
                    </span>
                  ))}
                </div>
              </div>
            </SceneIn>
          </div>
        </div>
      </section>

      {/* ── EUROPEAN POSITIONING ── */}
      <section className="py-20 lg:py-24" style={{ background: '#F5F2EC' }}>
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <SceneIn className="text-center mb-12">
            <span className="inline-block px-4 py-1.5 rounded-full border border-stone-300 text-stone-500 text-xs font-black uppercase tracking-widest mb-5">
              {c.european.eyebrow}
            </span>
            <h2 className="text-3xl sm:text-4xl font-black text-stone-950 tracking-tight mb-4">
              {c.european.h2}
            </h2>
            <p className="text-stone-500 text-lg max-w-2xl mx-auto leading-relaxed">
              {c.european.sub}
            </p>
          </SceneIn>

          {/* Language market grid */}
          <div className="grid grid-cols-3 sm:grid-cols-4 lg:grid-cols-9 gap-3 mb-10">
            {c.european.markets.map((m, i) => (
              <SceneIn key={i} delay={i * 0.05}>
                <div className="bg-white border border-stone-200 rounded-2xl p-4 text-center hover:border-stone-400 hover:shadow-sm transition-all cursor-default">
                  <span className="text-2xl mb-2 block">{m.flag}</span>
                  <p className="font-black text-stone-950 text-xs mb-0.5">{m.lang}</p>
                  <p className="text-stone-400 text-[10px] leading-tight">{m.visitors}</p>
                </div>
              </SceneIn>
            ))}
          </div>

          {/* GDPR note */}
          <SceneIn className="flex items-center justify-center gap-3">
            <Shield className="w-4 h-4 text-emerald-600 shrink-0" />
            <p className="text-stone-500 text-sm font-medium">{c.european.compliance}</p>
          </SceneIn>
        </div>
      </section>

      {/* ══ ROI SIMULATOR ══════════════════════════════════════════ */}
      <section className="py-24 lg:py-32 px-4 sm:px-6 lg:px-8 bg-stone-950 relative overflow-hidden">
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[800px] h-[600px] bg-amber-500/5 blur-[150px] rounded-full pointer-events-none" />
        <div className="max-w-5xl mx-auto relative z-10">
          <SceneIn className="text-center mb-16">
            <p className="text-xs font-bold text-amber-500 uppercase tracking-widest mb-3">{c.sim.eyebrow}</p>
            <h2 className="text-4xl sm:text-5xl font-black text-white tracking-tight mb-4">{c.sim.h2}</h2>
            <p className="text-stone-400 text-lg max-w-xl mx-auto">{c.sim.sub}</p>
          </SceneIn>

          <div className="grid md:grid-cols-2 gap-5">
            <SceneIn className="bg-stone-900 border border-stone-800 rounded-2xl p-8">
              <label className="block text-xs font-semibold text-stone-400 uppercase tracking-widest mb-5">{c.sim.label}</label>
              <div className="relative mb-6">
                <Users className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-stone-600" />
                <input
                  type="number"
                  placeholder={c.sim.placeholder}
                  value={monthlyVisitors}
                  onChange={e => setMonthlyVisitors(e.target.value)}
                  className="w-full pl-12 pr-4 py-4 bg-stone-800 border border-stone-700 rounded-xl text-white text-2xl font-black placeholder:text-stone-700 focus:outline-none focus:border-amber-500/70 focus:ring-2 focus:ring-amber-500/15 transition-all"
                />
              </div>
              <p className="text-xs text-stone-600 leading-relaxed">{c.sim.note}</p>
            </SceneIn>

            <AnimatePresence mode="wait">
              {lostRevenue !== null ? (
                <motion.div key="result"
                  initial={{ opacity: 0, scale: 0.96 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0 }}
                  transition={{ duration: 0.4, ease }}
                  className="relative bg-amber-500 rounded-2xl p-8 overflow-hidden flex flex-col"
                >
                  <div className="absolute -top-12 -right-12 w-40 h-40 bg-white/10 blur-3xl rounded-full" />
                  <p className="text-amber-950/60 text-[10px] font-bold uppercase tracking-widest mb-3">{c.sim.resultLabel}</p>
                  <motion.div key={lostRevenue} initial={{ y: 10, opacity: 0 }} animate={{ y: 0, opacity: 1 }}
                    className="text-7xl sm:text-8xl font-black text-white tracking-tighter tabular-nums mb-3 leading-none">
                    €{lostRevenue.toLocaleString('it-IT')}
                  </motion.div>
                  <p className="text-amber-100/80 text-sm leading-relaxed mb-8 flex-1">{c.sim.resultSub}</p>
                  <Link to="/onboarding" className="block w-full py-4 bg-stone-950 text-white rounded-xl font-black text-center hover:bg-stone-800 active:scale-[0.98] transition-all text-sm">
                    {c.sim.cta}
                  </Link>
                </motion.div>
              ) : (
                <motion.div key="empty" initial={{ opacity: 0 }} animate={{ opacity: 1 }}
                  className="bg-stone-900 border border-stone-800 border-dashed rounded-2xl p-8 flex flex-col items-center justify-center text-center min-h-[250px]">
                  <TrendingUp className="w-10 h-10 text-stone-700 mb-4" />
                  <p className="text-stone-600 text-sm">{c.sim.empty}</p>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </div>
      </section>

      {/* ══ PRICING ════════════════════════════════════════════════ */}
      <section id="pricing" className="py-24 lg:py-32 px-4 sm:px-6 lg:px-8" style={{ background: '#F5F2EC' }}>
        <div className="max-w-5xl mx-auto">
          <SceneIn className="text-center mb-16">
            <p className="text-xs font-bold text-amber-600 uppercase tracking-widest mb-3">{c.pricing.eyebrow}</p>
            <h2 className="text-4xl sm:text-5xl font-black text-stone-950 tracking-tight mb-4">{c.pricing.h2}</h2>
            <p className="text-stone-500 text-lg max-w-xl mx-auto">{c.pricing.sub}</p>
          </SceneIn>

          <SceneIn>
            <div className="grid md:grid-cols-2 gap-6">
              {/* QRGate offer */}
              <div className="bg-stone-950 rounded-2xl p-8 sm:p-10 flex flex-col relative overflow-hidden order-first">
                <div className="absolute top-0 right-0 w-48 h-48 bg-amber-500/10 blur-3xl rounded-full pointer-events-none" />
                <div className="flex items-center gap-2 mb-7 relative z-10">
                  <QrCode className="w-5 h-5 text-amber-400" />
                  <span className="font-black text-white text-lg">QRGate</span>
                  <span className="ml-auto text-[10px] font-bold text-amber-400 bg-amber-400/10 border border-amber-400/20 px-2.5 py-1 rounded-full uppercase tracking-widest">Pay as you go</span>
                </div>

                <div className="mb-2 relative z-10">
                  <span className="text-6xl font-black text-white tabular-nums tracking-tighter">€0,49</span>
                </div>
                <p className="text-stone-400 font-medium mb-8 relative z-10">+ 5% {lang === 'it' ? 'per biglietto venduto' : 'per ticket sold'}</p>

                <div className="bg-stone-900 border border-stone-800 rounded-xl p-5 mb-7 relative z-10">
                  <p className="text-xs text-stone-500 mb-3 font-medium">{c.pricing.priceLead}</p>
                  <div className="space-y-2">
                    <div className="flex justify-between"><span className="text-stone-500 text-sm">{lang === 'it' ? 'Incasso lordo' : 'Gross revenue'}</span><span className="text-stone-300 font-bold tabular-nums">{c.pricing.example.gross}</span></div>
                    <div className="flex justify-between"><span className="text-stone-600 text-sm">{c.pricing.example.feeLabel}</span><span className="text-stone-600 text-sm tabular-nums">− {c.pricing.example.fee}</span></div>
                    <div className="flex justify-between border-t border-stone-800 pt-2 mt-2">
                      <span className="text-white font-bold">{c.pricing.example.netLabel}</span>
                      <span className="text-emerald-400 font-black text-xl tabular-nums">{c.pricing.example.net}</span>
                    </div>
                  </div>
                </div>

                <p className="text-xs font-semibold text-stone-500 mb-5 relative z-10">{c.pricing.included}</p>
                <div className="space-y-2.5 mb-8 relative z-10 flex-1">
                  {c.pricing.items.map((item, i) => (
                    <div key={i} className="flex items-start gap-2.5">
                      <CheckCircle className="w-3.5 h-3.5 text-emerald-400 shrink-0 mt-0.5" />
                      <span className="text-xs text-stone-400 leading-relaxed">{item}</span>
                    </div>
                  ))}
                </div>

                <div className="relative z-10 space-y-3">
                  <Link to="/onboarding" className="block w-full py-4 bg-white text-stone-950 rounded-xl font-black text-center hover:bg-stone-100 active:scale-[0.98] transition-all">
                    {c.pricing.cta}
                  </Link>
                  <p className="text-[10px] text-stone-600 text-center leading-relaxed">{c.pricing.risk}</p>
                </div>
              </div>

              {/* Alternative */}
              <div className="bg-white border border-stone-200 rounded-2xl p-8 sm:p-10 flex flex-col">
                <div className="flex items-center gap-2 mb-7">
                  <AlertTriangle className="w-5 h-5 text-stone-300" />
                  <span className="font-bold text-stone-400">{c.pricing.altTitle}</span>
                </div>

                <div className="space-y-5 flex-1">
                  {c.pricing.altItems.map((item, i) => (
                    <div key={i} className="flex items-start gap-3 pb-5 border-b border-stone-100 last:border-0 last:pb-0">
                      <X className="w-4 h-4 text-red-300 shrink-0 mt-0.5" />
                      <span className="text-stone-400 text-sm line-through">{item}</span>
                    </div>
                  ))}
                </div>

                <div className="mt-8 bg-stone-50 border border-stone-100 rounded-xl p-5 text-center">
                  <p className="text-3xl font-black text-stone-200 tabular-nums">€ 1.800</p>
                  <p className="text-xs text-stone-400 mt-1">{lang === 'it' ? 'costo minimo mensile fisso' : 'minimum fixed monthly cost'}</p>
                </div>
              </div>
            </div>
          </SceneIn>
        </div>
      </section>

      {/* ══ SOCIAL PROOF ═══════════════════════════════════════════ */}
      <section className="py-24 lg:py-32 px-4 sm:px-6 lg:px-8 bg-white">
        <div className="max-w-7xl mx-auto">
          <SceneIn className="text-center mb-16">
            <p className="text-xs font-bold text-amber-600 uppercase tracking-widest mb-3">{c.social.eyebrow}</p>
            <h2 className="text-4xl sm:text-5xl font-black text-stone-950 tracking-tight">{c.social.h2}</h2>
          </SceneIn>

          <motion.div variants={stagger} initial="hidden" whileInView="visible" viewport={{ once: true, margin: '-60px' }} className="grid md:grid-cols-3 gap-6">
            {c.social.items.map((t, i) => (
              <motion.div key={i} variants={fadeUp} className="flex flex-col bg-stone-50 border border-stone-200 rounded-2xl p-7">
                <div className="flex gap-0.5 mb-5">
                  {[...Array(t.stars)].map((_, j) => <Star key={j} className="w-4 h-4 fill-amber-400 text-amber-400" />)}
                </div>
                <blockquote className="text-stone-700 text-sm leading-relaxed mb-6 flex-1 italic">"{t.quote}"</blockquote>
                <div className="flex items-end justify-between">
                  <div>
                    <p className="font-bold text-stone-900 text-sm">{t.name}</p>
                    <p className="text-stone-400 text-xs mt-0.5 leading-tight">{t.role}</p>
                  </div>
                  <span className="text-xs font-black text-emerald-700 bg-emerald-50 border border-emerald-100 px-2.5 py-1.5 rounded-lg whitespace-nowrap">{t.metric}</span>
                </div>
              </motion.div>
            ))}
          </motion.div>
        </div>
      </section>

      {/* ══ FAQ ════════════════════════════════════════════════════ */}
      <section className="py-24 lg:py-32 px-4 sm:px-6 lg:px-8" style={{ background: '#F5F2EC' }}>
        <div className="max-w-2xl mx-auto">
          <SceneIn className="text-center mb-14">
            <p className="text-xs font-bold text-amber-600 uppercase tracking-widest mb-3">{c.faq.eyebrow}</p>
            <h2 className="text-4xl font-black text-stone-950 tracking-tight">{c.faq.h2}</h2>
          </SceneIn>
          <SceneIn>
            <Accordion type="single" collapsible className="space-y-2.5">
              {c.faq.items.map((f, i) => (
                <AccordionItem key={i} value={`f${i}`} className="bg-white border border-stone-200 rounded-xl px-6 data-[state=open]:border-stone-300 data-[state=open]:shadow-sm">
                  <AccordionTrigger className="text-left font-semibold text-stone-800 hover:no-underline py-5 text-sm leading-snug">{f.q}</AccordionTrigger>
                  <AccordionContent className="text-stone-500 text-sm leading-relaxed pb-5">{f.a}</AccordionContent>
                </AccordionItem>
              ))}
            </Accordion>
          </SceneIn>
        </div>
      </section>

      {/* ══ FINAL CTA ══════════════════════════════════════════════ */}
      <section className="relative py-28 lg:py-36 px-4 sm:px-6 lg:px-8 bg-stone-950 overflow-hidden">
        <div className="absolute inset-0 opacity-[0.035] pointer-events-none" style={{ backgroundImage: "url(\"data:image/svg+xml,%3Csvg viewBox='0 0 400 400' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)' opacity='1'/%3E%3C/svg%3E\")", backgroundSize: '400px' }} />
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[900px] h-[500px] bg-amber-400/6 blur-[150px] rounded-full pointer-events-none" />

        <div className="max-w-3xl mx-auto text-center relative z-10">
          <SceneIn>
            <p className="text-xs font-bold text-amber-500 uppercase tracking-widest mb-5">{c.cta.eyebrow}</p>
            <h2 className="text-4xl sm:text-5xl lg:text-[3.75rem] font-black text-white tracking-tight mb-6 leading-[1.06]">
              {c.cta.h2}
            </h2>
            <p className="text-stone-400 text-xl mb-12 max-w-2xl mx-auto leading-relaxed">{c.cta.sub}</p>

            <div className="flex flex-col sm:flex-row gap-3 justify-center mb-8">
              <Link to="/onboarding"
                className="inline-flex items-center justify-center gap-2 px-9 py-4.5 bg-white text-stone-950 rounded-xl font-black text-base hover:bg-stone-100 active:scale-[0.98] transition-all shadow-2xl shadow-black/40">
                {c.cta.cta1} <ArrowRight className="w-4 h-4" />
              </Link>
              <a href="https://calendly.com/qrgate-demo" target="_blank" rel="noopener noreferrer"
                className="inline-flex items-center justify-center gap-2 px-9 py-4.5 border border-stone-700 text-stone-400 rounded-xl font-semibold text-base hover:border-stone-500 hover:text-stone-200 transition-all">
                <PlayCircle className="w-4 h-4" /> {c.cta.cta2}
              </a>
            </div>

            <p className="text-stone-600 text-xs tracking-wide">{c.cta.micro}</p>
          </SceneIn>
        </div>
      </section>

      <Footer />
    </div>
  );
};

export default Homepage;
