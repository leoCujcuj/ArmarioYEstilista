import React, { useState, useRef, useEffect } from 'react';
import { MessageSquare, Send, X, ChevronDown, History, Plus, Loader2, Trash2 } from 'lucide-react';
import styles from './Chatbot.module.css';

interface Message {
  role: 'user' | 'assistant';
  content: string;
}

interface ChatSession {
  _id: string;
  titulo: string;
  updatedAt: string;
}

export const Chatbot: React.FC = () => {
  const [isOpen, setIsOpen] = useState(false);
  const [view, setView] = useState<'chat' | 'history'>('chat');
  const [sessions, setSessions] = useState<ChatSession[]>([]);
  const [currentSessionId, setCurrentSessionId] = useState<string | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [loadingHistory, setLoadingHistory] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3000';

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    if (isOpen && view === 'chat') {
      scrollToBottom();
    }
  }, [messages, isOpen, view]);

  useEffect(() => {
    if (isOpen && view === 'history') {
      fetchSessions();
    }
  }, [isOpen, view]);

  const fetchSessions = async () => {
    setLoadingHistory(true);
    try {
      const response = await fetch(`${API_URL}/api/chat/sessions`, {
        headers: { 'Authorization': `Bearer ${localStorage.getItem('token')}` }
      });
      if (response.ok) {
        const data = await response.json();
        setSessions(data);
      }
    } catch (error) {
      console.error('Error fetching sessions:', error);
    } finally {
      setLoadingHistory(false);
    }
  };

  const startNewChat = () => {
    setCurrentSessionId(null);
    setMessages([]);
    setView('chat');
  };

  const loadSession = async (sessionId: string) => {
    setIsLoading(true);
    setCurrentSessionId(sessionId);
    setView('chat');
    try {
      const response = await fetch(`${API_URL}/api/chat/sessions/${sessionId}`, {
        headers: { 'Authorization': `Bearer ${localStorage.getItem('token')}` }
      });
      if (response.ok) {
        const data = await response.json();
        setMessages(data.mensajes);
      }
    } catch (error) {
      console.error('Error loading session:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const deleteSession = async (e: React.MouseEvent, sessionId: string) => {
    e.stopPropagation();
    try {
      const response = await fetch(`${API_URL}/api/chat/sessions/${sessionId}`, {
        method: 'DELETE',
        headers: { 'Authorization': `Bearer ${localStorage.getItem('token')}` }
      });
      if (response.ok) {
        setSessions(prev => prev.filter(s => s._id !== sessionId));
        if (currentSessionId === sessionId) startNewChat();
      }
    } catch (error) {
      console.error('Error deleting session:', error);
    }
  };

  const handleSend = async () => {
    if (!input.trim() || isLoading) return;

    const userMessage = input.trim();
    setInput('');
    
    const newMessages: Message[] = [...messages, { role: 'user', content: userMessage }];
    setMessages(newMessages);
    setIsLoading(true);

    try {
      const response = await fetch(`${API_URL}/api/chat`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        },
        body: JSON.stringify({ 
          mensaje: userMessage,
          sessionId: currentSessionId 
        })
      });

      const data = await response.json();
      if (data.respuesta) {
        setMessages(prev => [...prev, { role: 'assistant', content: data.respuesta }]);
        if (!currentSessionId && data.sessionId) {
          setCurrentSessionId(data.sessionId);
        }
      }
    } catch (error) {
      setMessages(prev => [...prev, { role: 'assistant', content: 'Error de conexión.' }]);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className={styles.chatbotContainer}>
      {isOpen && (
        <div className={styles.chatWindow}>
          <div className={styles.chatHeader}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
              <MessageSquare size={18} color="var(--accent)" />
              <h3>{view === 'chat' ? 'Asesor Personal' : 'Historial de Chats'}</h3>
            </div>
            <div className={styles.headerActions}>
              {view === 'chat' ? (
                <button className={styles.actionBtn} onClick={() => setView('history')} title="Ver historial">
                  <History size={18} />
                </button>
              ) : (
                <button className={styles.actionBtn} onClick={() => setView('chat')} title="Volver al chat">
                  <Plus size={18} />
                </button>
              )}
              <button className={styles.closeButton} onClick={() => setIsOpen(false)}>
                <X size={20} />
              </button>
            </div>
          </div>

          {view === 'chat' ? (
            <>
              <div className={styles.messagesContainer}>
                {messages.length === 0 && (
                  <div style={{ textAlign: 'center', padding: '40px 20px', color: 'var(--muted)' }}>
                    <Sparkles size={32} color="var(--accent)" style={{ marginBottom: '15px', opacity: 0.5 }} />
                    <p fontSize="0.9rem">¿En qué puedo ayudarte con tu estilo hoy?</p>
                  </div>
                )}
                {messages.map((msg, i) => (
                  <div key={i} className={`${styles.message} ${msg.role === 'user' ? styles.userMessage : styles.aiMessage}`}>
                    {msg.content}
                  </div>
                ))}
                {isLoading && <div className={styles.loading}>Escribiendo...</div>}
                <div ref={messagesEndRef} />
              </div>
              <div className={styles.inputArea}>
                <input
                  type="text"
                  placeholder="Escribe tu mensaje..."
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                  onKeyPress={(e) => e.key === 'Enter' && handleSend()}
                />
                <button className={styles.sendButton} onClick={handleSend} disabled={isLoading}>
                  <Send size={18} />
                </button>
              </div>
            </>
          ) : (
            <div className={styles.historyView}>
              <button className={styles.newChatBtn} onClick={startNewChat}>
                <Plus size={16} /> Nueva Conversación
              </button>
              
              {loadingHistory ? (
                <div style={{ display: 'flex', justifyContent: 'center', padding: '40px' }}><Loader2 className="spin" /></div>
              ) : sessions.length > 0 ? (
                sessions.map(s => (
                  <div key={s._id} className={styles.sessionItem} onClick={() => loadSession(s._id)}>
                    <div className={styles.sessionInfo}>
                      <div className={styles.sessionTitle}>{s.titulo}</div>
                      <div className={styles.sessionDate}>{new Date(s.updatedAt).toLocaleDateString()}</div>
                    </div>
                    <button className={styles.actionBtn} onClick={(e) => deleteSession(e, s._id)}>
                      <Trash2 size={14} />
                    </button>
                  </div>
                ))
              ) : (
                <div style={{ textAlign: 'center', padding: '40px', color: 'var(--muted)', fontSize: '0.85rem' }}>No hay chats anteriores.</div>
              )}
            </div>
          )}
        </div>
      )}
      <button className={styles.chatButton} onClick={() => setIsOpen(!isOpen)}>
        {isOpen ? <ChevronDown size={24} /> : <MessageSquare size={24} />}
      </button>
    </div>
  );
};

const Sparkles = ({ size, color, style }: any) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={style}>
    <path d="m12 3-1.912 5.813a2 2 0 0 1-1.275 1.275L3 12l5.813 1.912a2 2 0 0 1 1.275 1.275L12 21l1.912-5.813a2 2 0 0 1 1.275-1.275L21 12l-5.813-1.912a2 2 0 0 1-1.275-1.275L12 3Z"/>
    <path d="M5 3v4"/><path d="M3 5h4"/><path d="M21 17v4"/><path d="M19 19h4"/>
  </svg>
);

