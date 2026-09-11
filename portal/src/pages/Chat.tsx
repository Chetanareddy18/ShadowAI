import { useState, useRef } from 'react';
import { Send, Trash2, Shield, ShieldOff, ShieldAlert, ShieldCheck } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { api, type PromptResponse } from '../lib/api';
import PageShell from '../components/PageShell';
import { DecisionBadge, RiskBadge } from '../components/Badges';

interface Message {
  id: string;
  role: 'user' | 'assistant';
  text: string;
  response?: PromptResponse;
  error?: string;
  timestamp: Date;
}

const DECISION_BUBBLE: Record<string, string> = {
  BLOCK:    'border-rose-500/30 bg-rose-500/5',
  SANITIZE: 'border-amber-400/30 bg-amber-400/5',
  ALLOW:    'border-white/8 bg-white/3',
};

export default function Chat() {
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput]       = useState('');
  const [model, setModel]       = useState('');
  const [orgId, setOrgId]       = useState('');
  const [sending, setSending]   = useState(false);
  const [sigs, setSigs]         = useState({ total: 0, blocked: 0, sanitized: 0, allowed: 0 });
  const bottomRef = useRef<HTMLDivElement>(null);

  const send = async () => {
    const prompt = input.trim();
    if (!prompt || sending) return;
    setInput('');
    setSending(true);

    const userMsg: Message = { id: Date.now().toString(), role: 'user', text: prompt, timestamp: new Date() };
    setMessages(m => [...m, userMsg]);

    try {
      const body = { prompt, ...(model ? { model } : {}), ...(orgId ? { org_id: orgId } : {}) };
      const res = await api.processPrompt(body);
      setSigs(s => ({
        total: s.total + 1,
        blocked:   s.blocked   + (res.decision === 'BLOCK'    ? 1 : 0),
        sanitized: s.sanitized + (res.decision === 'SANITIZE' ? 1 : 0),
        allowed:   s.allowed   + (res.decision === 'ALLOW'    ? 1 : 0),
      }));
      setMessages(m => [...m, { id: Date.now().toString() + '_r', role: 'assistant', text: res.message ?? '', response: res, timestamp: new Date() }]);
    } catch (e: unknown) {
      setMessages(m => [...m, { id: Date.now().toString() + '_e', role: 'assistant', text: '', error: e instanceof Error ? e.message : 'Error', timestamp: new Date() }]);
    } finally {
      setSending(false);
      setTimeout(() => bottomRef.current?.scrollIntoView({ behavior: 'smooth' }), 50);
    }
  };

  return (
    <PageShell title="Prompt Studio" subtitle="Test prompts through the security gateway">
      <div className="flex gap-4 h-[calc(100vh-180px)]">
        {/* Messages */}
        <div className="flex-1 flex flex-col min-w-0">
          <div className="flex-1 overflow-y-auto space-y-3 mb-3 pr-1">
            {!messages.length && (
              <div className="flex flex-col items-center justify-center h-full text-white/20">
                <Shield className="w-12 h-12 mb-3 opacity-20" />
                <p className="text-sm">Send a prompt — every message is scanned</p>
                <p className="text-xs mt-1 opacity-60">Try: "Ignore all previous instructions"</p>
              </div>
            )}
            <AnimatePresence initial={false}>
              {messages.map(msg => (
                <motion.div key={msg.id} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.15 }}
                  className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}
                >
                  {msg.role === 'user' ? (
                    <div className="max-w-[75%] px-4 py-2.5 bg-cyan-400/10 border border-cyan-400/20 rounded-2xl rounded-tr-sm text-sm text-white/90">
                      {msg.text}
                    </div>
                  ) : (
                    <div className={`max-w-[75%] px-4 py-3 border rounded-2xl rounded-tl-sm ${msg.error ? 'border-rose-500/20 bg-rose-500/5' : DECISION_BUBBLE[msg.response?.decision ?? ''] ?? 'border-white/8 bg-white/3'}`}>
                      {msg.error ? (
                        <p className="text-xs text-rose-400">{msg.error}</p>
                      ) : (
                        <>
                          <div className="flex items-center gap-2 mb-2 flex-wrap">
                            {msg.response && <DecisionBadge v={msg.response.decision} />}
                            {msg.response && <RiskBadge v={msg.response.risk_level} />}
                          </div>
                          {msg.text && <p className="text-sm text-white/80 mb-1">{msg.text}</p>}
                          {msg.response?.sanitized_prompt && (
                            <div className="mt-2 pt-2 border-t border-white/8">
                              <p className="text-[10px] text-white/30 mb-1">SANITIZED</p>
                              <p className="text-xs text-amber-400/80">{msg.response.sanitized_prompt}</p>
                            </div>
                          )}
                          {msg.response?.findings && Object.keys(msg.response.findings).length > 0 && (
                            <p className="text-[10px] text-white/30 mt-1.5">
                              Findings: {Object.keys(msg.response.findings).join(', ')}
                            </p>
                          )}
                        </>
                      )}
                    </div>
                  )}
                </motion.div>
              ))}
              {sending && (
                <motion.div key="thinking" initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="flex justify-start">
                  <div className="px-4 py-3 bg-white/3 border border-white/8 rounded-2xl rounded-tl-sm">
                    <div className="flex gap-1">
                      {[0, 0.15, 0.3].map(d => (
                        <span key={d} style={{ animationDelay: `${d}s` }}
                          className="w-1.5 h-1.5 bg-cyan-400 rounded-full animate-bounce" />
                      ))}
                    </div>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
            <div ref={bottomRef} />
          </div>

          {/* Input */}
          <div className="bg-cyber-900/80 border border-white/8 rounded-2xl p-3">
            <textarea
              value={input}
              onChange={e => setInput(e.target.value)}
              onKeyDown={e => { if (e.key === 'Enter' && e.ctrlKey) send(); }}
              rows={2}
              placeholder="Type a prompt… (Ctrl+Enter to send)"
              className="w-full bg-transparent text-sm text-white placeholder:text-white/20 focus:outline-none resize-none leading-relaxed"
            />
            <div className="flex items-center justify-between mt-2">
              <span className="text-[10px] text-white/20">{input.length} chars</span>
              <button onClick={send} disabled={!input.trim() || sending}
                className="flex items-center gap-1.5 px-3 py-1.5 bg-cyan-400 hover:bg-cyan-300 text-black text-xs font-bold rounded-lg transition-colors disabled:opacity-40">
                <Send className="w-3.5 h-3.5" /> Send
              </button>
            </div>
          </div>
        </div>

        {/* Signals panel */}
        <div className="w-48 flex-shrink-0 space-y-3">
          {[
            { label: 'Total',     val: sigs.total,     icon: <Shield className="w-4 h-4" />,      cls: 'text-cyan-400' },
            { label: 'Blocked',   val: sigs.blocked,   icon: <ShieldOff className="w-4 h-4" />,   cls: 'text-rose-400' },
            { label: 'Sanitized', val: sigs.sanitized, icon: <ShieldAlert className="w-4 h-4" />, cls: 'text-amber-400' },
            { label: 'Allowed',   val: sigs.allowed,   icon: <ShieldCheck className="w-4 h-4" />, cls: 'text-mint-400' },
          ].map(({ label, val, icon, cls }) => (
            <div key={label} className="bg-cyber-900/60 border border-white/5 rounded-2xl p-4">
              <div className="flex items-center justify-between mb-1">
                <p className="text-xs text-white/40">{label}</p>
                <span className={cls}>{icon}</span>
              </div>
              <p className={`text-2xl font-bold ${cls}`}>{val}</p>
            </div>
          ))}

          <div className="bg-cyber-900/60 border border-white/5 rounded-2xl p-3 space-y-2">
            <div>
              <p className="text-[10px] text-white/30 mb-1">MODEL</p>
              <input value={model} onChange={e => setModel(e.target.value)} placeholder="gpt-4o-mini"
                className="w-full text-xs bg-white/5 border border-white/8 rounded-lg px-2 py-1.5 text-white/70 placeholder:text-white/20 focus:outline-none" />
            </div>
            <div>
              <p className="text-[10px] text-white/30 mb-1">ORG ID</p>
              <input value={orgId} onChange={e => setOrgId(e.target.value)} placeholder="org_default"
                className="w-full text-xs bg-white/5 border border-white/8 rounded-lg px-2 py-1.5 text-white/70 placeholder:text-white/20 focus:outline-none" />
            </div>
          </div>

          <button onClick={() => { setMessages([]); setSigs({ total: 0, blocked: 0, sanitized: 0, allowed: 0 }); }}
            className="w-full flex items-center justify-center gap-1.5 py-2 bg-white/3 hover:bg-white/8 border border-white/8 rounded-xl text-xs text-white/30 hover:text-white/60 transition-all">
            <Trash2 className="w-3 h-3" /> Clear chat
          </button>
        </div>
      </div>
    </PageShell>
  );
}
