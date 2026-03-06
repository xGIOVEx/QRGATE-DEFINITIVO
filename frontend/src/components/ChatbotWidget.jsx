import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import { useLocation, useNavigate } from 'react-router-dom';
import {
  Send, Bot, User, Sparkles, X, ChevronRight, MessageSquare,
  RefreshCcw, Info, CheckCircle2, AlertCircle, TrendingUp, CreditCard, LayoutDashboard,
  Zap, MessageCircle
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { marked } from 'marked';
import DOMPurify from 'dompurify';

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;

// =======================================
// Markdown renderer: safe HTML from text
// =======================================
marked.setOptions({ breaks: true, gfm: true });

const MarkdownMessage = ({ text }) => {
  const html = DOMPurify.sanitize(marked.parse(text || ''));
  return (
    <div
      className="text-sm prose prose-sm max-w-none prose-p:my-1 prose-li:my-0.5 prose-strong:text-current"
      dangerouslySetInnerHTML={{ __html: html }}
    />
  );
};

// =======================================
// Confirmation modal for destructive actions
// =======================================
const ConfirmModal = ({ message, onConfirm, onCancel }) => (
  <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
    <motion.div
      initial={{ scale: 0.9, opacity: 0 }}
      animate={{ scale: 1, opacity: 1 }}
      className="bg-white rounded-2xl shadow-2xl p-6 max-w-sm w-full"
    >
      <h3 className="font-bold text-slate-800 mb-3 text-base">⚠️ Conferma azione</h3>
      <p className="text-sm text-slate-600 mb-5">{message}</p>
      <div className="flex gap-3">
        <button
          onClick={onCancel}
          className="flex-1 py-2 rounded-xl border border-slate-200 text-slate-600 text-sm font-semibold hover:bg-slate-50 transition-colors"
        >
          Annulla
        </button>
        <button
          onClick={onConfirm}
          className="flex-1 py-2 rounded-xl bg-red-600 text-white text-sm font-bold hover:bg-red-700 transition-colors"
        >
          Conferma
        </button>
      </div>
    </motion.div>
  </div>
);

const DESTRUCTIVE_TOOLS = ['refund_order', 'delete_venue_data', 'update_ticket_price'];

export default function ChatbotWidget() {
  const { t, i18n } = useTranslation();
  const location = useLocation();
  const navigate = useNavigate();
  const [isOpen, setIsOpen] = useState(false);
  const [messages, setMessages] = useState([]);
  const [inputText, setInputText] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const [sessionId, setSessionId] = useState('');
  const [showNotification, setShowNotification] = useState(false);
  // Streaming state
  const [streamingText, setStreamingText] = useState('');
  const [isStreaming, setIsStreaming] = useState(false);
  // Pending destructive action confirmation
  const [pendingConfirm, setPendingConfirm] = useState(null);
  const messagesEndRef = useRef(null);
  const abortRef = useRef(null);

  useEffect(() => {
    const storedSessionId = localStorage.getItem('qrgate_chat_session');
    if (storedSessionId) {
      setSessionId(storedSessionId);
    } else {
      const newSessionId = `session-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
      setSessionId(newSessionId);
      localStorage.setItem('qrgate_chat_session', newSessionId);
    }
    if (location.pathname === '/') {
      const timer = setTimeout(() => setShowNotification(true), 30000);
      return () => clearTimeout(timer);
    }
  }, [location.pathname]);

  useEffect(() => {
    if (isOpen && messages.length === 0) {
      setMessages([{
        type: 'bot',
        text: t('chatbot.greeting'),
        chips: [
          t('chatbot.howMuch'),
          t('chatbot.howToGetPaid'),
          t('chatbot.noWebsite'),
          t('chatbot.howLong'),
          t('chatbot.howItWorks'),
        ]
      }]);
    }
  }, [isOpen, t]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, streamingText]);

  // Handle Aria actions locally
  useEffect(() => {
    const handleAriaAction = (e) => {
      const { action, payload } = e.detail;
      if (action === 'ui_action_navigate') {
        navigate(payload.path);
      } else if (action === 'ui_action_recommend_audit') {
        setMessages(prev => [...prev, {
          type: 'bot',
          text: "Ti consiglio di consultare il team **Audit (Review Agents)** per un'analisi millimetrica dei tuoi colori e del codice.",
          quickActions: [{ "label": "Vai a Review Agents", "icon": "🛡️", "action": "navigate_to_review" }]
        }]);
      }
    };
    window.addEventListener('aria-action', handleAriaAction);
    return () => window.removeEventListener('aria-action', handleAriaAction);
  }, [navigate]);

  // =========================================
  // Handler principale con SSE Streaming
  // =========================================
  const handleSendMessage = useCallback(async (text, bypassConfirm = false) => {
    const messageText = text || inputText;
    if (!messageText.trim() || isTyping || isStreaming) return;

    // Handle internal quick actions first
    if (text === "Vai a Review Agents") {
      navigate('/dashboard/review-agents');
      return;
    }

    const newMessages = [...messages, { type: 'user', text: messageText }];
    setMessages(newMessages);
    setInputText('');
    setIsTyping(true);

    const apiMessages = newMessages
      .filter(m => m.text)
      .map(m => ({ role: m.type === 'bot' ? 'assistant' : 'user', content: m.text }));

    const token = localStorage.getItem('qrgate_token') || localStorage.getItem('qrgate_staff_token');
    const headers = {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {})
    };

    const body = JSON.stringify({
      messages: apiMessages,
      visitor_context: { session_id: sessionId, language: i18n.language }
    });

    try {
      const streamUrl = `${BACKEND_URL}/api/v1/aria/chat/stream`;
      abortRef.current = new AbortController();

      const res = await fetch(streamUrl, {
        method: 'POST',
        headers,
        body,
        signal: abortRef.current.signal,
      });

      if (res.ok && res.headers.get('content-type')?.includes('text/event-stream')) {
        setIsTyping(false);
        setIsStreaming(true);
        let accum = '';
        let currentQuickActions = [];
        const reader = res.body.getReader();
        const decoder = new TextDecoder();

        while (true) {
          const { done, value } = await reader.read();
          if (done) break;
          const chunk = decoder.decode(value, { stream: true });
          const lines = chunk.split('\n');
          for (const line of lines) {
            if (line.startsWith('data: ')) {
              const data = line.slice(6);
              if (data === '[DONE]') break;
              try {
                const parsed = JSON.parse(data);
                if (parsed.delta) {
                  accum += parsed.delta;
                  setStreamingText(accum);
                } else if (parsed.ui_directives) {
                  parsed.ui_directives.forEach(directive => {
                    window.dispatchEvent(new CustomEvent('aria-action', { detail: directive }));
                  });
                } else if (parsed.quick_actions) {
                  currentQuickActions = [...currentQuickActions, ...parsed.quick_actions];
                }
              } catch { /* ignore partial */ }
            }
          }
        }

        setMessages(prev => [...prev, {
          type: 'bot',
          text: accum,
          quickActions: currentQuickActions,
        }]);
        setStreamingText('');
        setIsStreaming(false);

      } else {
        const json = await res.json();
        setIsTyping(false);
        const botMessage = {
          type: 'bot',
          text: json.reply,
          quickActions: json.quick_actions || [],
        };
        (json.ui_directives || []).forEach(d => window.dispatchEvent(new CustomEvent('aria-action', { detail: d })));
        setMessages(prev => [...prev, botMessage]);
      }
    } catch (error) {
      if (error.name === 'AbortError') return;
      setIsTyping(false);
      setIsStreaming(false);
      setStreamingText('');
      setMessages(prev => [...prev, {
        type: 'bot',
        text: i18n.language === 'it'
          ? 'Errore di connessione. Riprova.'
          : 'Connection error. Try again.',
      }]);
    }
  }, [messages, inputText, isTyping, isStreaming, sessionId, i18n.language, navigate]);

  return (
    <>
      {pendingConfirm && (
        <ConfirmModal
          message={pendingConfirm.message}
          onConfirm={pendingConfirm.onConfirm}
          onCancel={pendingConfirm.onCancel}
        />
      )}

      <motion.button
        initial={{ scale: 0 }}
        animate={{ scale: 1 }}
        whileHover={{ scale: 1.05 }}
        onClick={() => { setIsOpen(true); setShowNotification(false); }}
        className="fixed bottom-6 right-6 z-40 w-16 h-16 bg-stone-950 rounded-2xl shadow-2xl flex items-center justify-center text-white hover:bg-stone-900 transition-all border border-white/10"
      >
        <MessageCircle className="w-7 h-7" />
        {showNotification && (
          <span className="absolute -top-1 -right-1 w-3 h-3 bg-red-500 rounded-full animate-pulse" />
        )}
      </motion.button>

      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0, y: 20, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 20, scale: 0.95 }}
            className="fixed bottom-24 right-6 z-50 w-96 h-[620px] max-w-[calc(100vw-48px)] bg-white rounded-[2.5rem] shadow-2xl flex flex-col overflow-hidden border border-stone-200"
          >
            <div className="bg-stone-950 text-white p-5 flex items-center justify-between shrink-0">
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-full bg-white/20 flex items-center justify-center">
                  <Zap className="w-5 h-5" />
                </div>
                <div>
                  <p className="font-bold tracking-tight">Aria</p>
                  <p className="text-xs opacity-80 flex items-center gap-1">
                    <span className="w-1.5 h-1.5 rounded-full bg-green-400" />
                    {isStreaming ? 'Scrivendo…' : 'Disponibile'}
                  </p>
                </div>
              </div>
              <button onClick={() => { setIsOpen(false); abortRef.current?.abort(); }} className="text-white/40 hover:text-white">
                <X className="w-6 h-6" />
              </button>
            </div>

            <div className="flex-1 overflow-y-auto p-5 space-y-6 bg-stone-50/50">
              {messages.map((msg, idx) => (
                <div key={idx} className={`flex ${msg.type === 'user' ? 'justify-end' : 'justify-start'}`}>
                  <div className={`max-w-[85%] rounded-[2rem] px-5 py-3.5 ${msg.type === 'user'
                      ? 'bg-amber-600 text-white rounded-br-md shadow-lg'
                      : 'bg-white text-stone-800 rounded-bl-md shadow-sm border border-stone-100'
                    }`}>
                    {msg.type === 'bot' ? <MarkdownMessage text={msg.text} /> : <p className="text-sm">{msg.text}</p>}

                    {msg.chips && (
                      <div className="flex flex-wrap gap-2 mt-3">
                        {msg.chips.map((chip, ci) => (
                          <button key={ci} onClick={() => handleSendMessage(chip)} className="px-3 py-1.5 bg-stone-100 text-stone-950 text-[10px] rounded-full hover:bg-stone-200 font-bold border border-stone-200 uppercase tracking-tighter">
                            {chip}
                          </button>
                        ))}
                      </div>
                    )}

                    {msg.quickActions && (
                      <div className="mt-3 flex flex-col gap-1.5">
                        <p className="text-[9px] uppercase tracking-widest text-slate-400 font-black">Azioni rapide</p>
                        {msg.quickActions.map((qa, qi) => (
                          <button key={qi} onClick={() => handleSendMessage(qa.label)} className="w-full text-left px-4 py-3 rounded-2xl bg-stone-900 text-white text-xs font-bold hover:bg-stone-800 transition-all flex items-center gap-3">
                            {qa.icon && <span>{qa.icon}</span>}
                            {qa.label}
                          </button>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              ))}
              {isStreaming && streamingText && (
                <div className="flex justify-start">
                  <div className="max-w-[85%] bg-white rounded-[2rem] rounded-bl-md px-5 py-3.5 shadow-sm border border-stone-100">
                    <MarkdownMessage text={streamingText} />
                    <span className="inline-block w-1.5 h-4 bg-amber-600 animate-pulse ml-1 align-middle" />
                  </div>
                </div>
              )}
              {isTyping && !isStreaming && (
                <div className="flex justify-start">
                  <div className="bg-white rounded-2xl px-4 py-3 shadow-sm border border-stone-100 flex gap-1">
                    {[0, 0.2, 0.4].map((d, i) => <div key={i} className="w-2 h-2 bg-stone-200 rounded-full animate-bounce" style={{ animationDelay: `${d}s` }} />)}
                  </div>
                </div>
              )}
              <div ref={messagesEndRef} />
            </div>

            <div className="p-5 bg-white shrink-0 border-t border-stone-100">
              <form onSubmit={(e) => { e.preventDefault(); handleSendMessage(); }} className="flex gap-2">
                <input
                  type="text"
                  value={inputText}
                  onChange={(e) => setInputText(e.target.value)}
                  placeholder="Scrivi ad Aria..."
                  className="flex-1 px-4 py-3 bg-stone-50 border border-stone-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-amber-600 text-sm"
                />
                <button type="submit" disabled={!inputText.trim() || isTyping || isStreaming} className="w-12 h-12 bg-stone-950 text-white rounded-xl flex items-center justify-center disabled:opacity-30">
                  <Send className="w-5 h-5" />
                </button>
              </form>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}