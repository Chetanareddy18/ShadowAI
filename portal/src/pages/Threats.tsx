import { useEffect, useRef, useState } from 'react';
import { useSession } from '../store/session';
import { RiskBadge, DecisionBadge } from '../components/Badges';
import PageShell from '../components/PageShell';
import { motion, AnimatePresence } from 'framer-motion';
import { api, type AnomalyEvent } from '../lib/api';
import { Wifi, WifiOff, Trash2, RefreshCw } from 'lucide-react';

interface ThreatEvent {
  id: string;
  timestamp: string;
  user_id: string;
  org_id?: string;
  decision: string;
  risk_level: string;
  topic?: string;
  findings?: Record<string, unknown>;
  message?: string;
}

function ThreatItem({ ev }: { ev: ThreatEvent }) {
  const border: Record<string, string> = {
    CRITICAL: 'border-l-rose-500', HIGH: 'border-l-amber-400',
    MEDIUM: 'border-l-violet-500', LOW: 'border-l-cyan-400',
  };
  return (
    <motion.div
      initial={{ opacity: 0, x: -12 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, height: 0 }}
      transition={{ duration: 0.2 }}
      className={`flex items-start gap-3 p-3.5 bg-white/3 border border-white/5 border-l-2 ${border[ev.risk_level] ?? 'border-l-white/20'} rounded-xl`}
    >
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 flex-wrap mb-1">
          <DecisionBadge v={ev.decision} />
          <RiskBadge v={ev.risk_level} />
          <span className="text-xs font-mono text-white/60">{ev.user_id}</span>
          {ev.org_id && <span className="text-[10px] bg-white/8 text-white/40 px-1.5 py-0.5 rounded">{ev.org_id}</span>}
        </div>
        {ev.message && <p className="text-xs text-white/50 truncate">{ev.message}</p>}
        {ev.findings && Object.keys(ev.findings).length > 0 && (
          <p className="text-[10px] text-white/30 mt-0.5">Findings: {Object.keys(ev.findings).join(', ')}</p>
        )}
      </div>
      <span className="text-[10px] text-white/25 flex-shrink-0 mt-0.5">
        {new Date(ev.timestamp).toLocaleTimeString()}
      </span>
    </motion.div>
  );
}

export default function Threats() {
  const { apiKey, gatewayUrl } = useSession();
  const [events, setEvents]   = useState<ThreatEvent[]>([]);
  const [connected, setConnected] = useState(false);
  const [counts, setCounts]   = useState({ critical: 0, high: 0, blocked: 0 });
  const [anomalies, setAnomalies] = useState<AnomalyEvent[]>([]);
  const esRef = useRef<EventSource | null>(null);

  const connect = () => {
    esRef.current?.close();
    const url = `${gatewayUrl}/admin/events/stream?x_api_key=${encodeURIComponent(apiKey)}`;
    const es = new EventSource(url);
    esRef.current = es;

    es.onopen = () => setConnected(true);
    es.onmessage = (e) => {
      try {
        const ev = JSON.parse(e.data) as ThreatEvent;
        if (ev.decision === 'connected') return;
        setEvents(prev => [ev, ...prev].slice(0, 100));
        setCounts(prev => ({
          critical: prev.critical + (ev.risk_level === 'CRITICAL' ? 1 : 0),
          high:     prev.high     + (ev.risk_level === 'HIGH'     ? 1 : 0),
          blocked:  prev.blocked  + (ev.decision   === 'BLOCK'    ? 1 : 0),
        }));
      } catch { /* skip */ }
    };
    es.onerror = () => setConnected(false);
  };

  useEffect(() => {
    connect();
    api.anomalies(15).then(setAnomalies).catch(() => {});
    return () => esRef.current?.close();
  }, []);

  const clear = () => {
    setEvents([]);
    setCounts({ critical: 0, high: 0, blocked: 0 });
  };

  return (
    <PageShell
      title="Live Threat Feed"
      subtitle="Real-time SSE stream from the gateway"
      actions={
        <div className="flex items-center gap-2">
          <span className={`flex items-center gap-1.5 text-xs px-2.5 py-1 rounded-full border ${connected ? 'border-mint-400/30 text-mint-400 bg-mint-400/10' : 'border-rose-500/30 text-rose-400 bg-rose-500/10'}`}>
            {connected ? <><Wifi className="w-3 h-3" /> Live</> : <><WifiOff className="w-3 h-3" /> Disconnected</>}
          </span>
          <button onClick={connect} className="p-1.5 rounded-lg text-white/40 hover:text-white hover:bg-white/5 transition-all" title="Reconnect">
            <RefreshCw className="w-4 h-4" />
          </button>
          <button onClick={clear} className="p-1.5 rounded-lg text-white/40 hover:text-rose-400 hover:bg-white/5 transition-all" title="Clear">
            <Trash2 className="w-4 h-4" />
          </button>
        </div>
      }
    >
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {/* Feed */}
        <div className="lg:col-span-2 space-y-3">
          {/* Counter chips */}
          <div className="flex gap-2">
            {[
              { label: 'Critical', val: counts.critical, cls: 'bg-rose-500/10 text-rose-400 border-rose-500/30' },
              { label: 'High',     val: counts.high,     cls: 'bg-amber-400/10 text-amber-400 border-amber-400/30' },
              { label: 'Blocked',  val: counts.blocked,  cls: 'bg-violet-500/10 text-violet-400 border-violet-500/30' },
            ].map(c => (
              <span key={c.label} className={`text-xs px-3 py-1 rounded-full border ${c.cls}`}>
                {c.label}: <strong>{c.val}</strong>
              </span>
            ))}
          </div>

          <div className="bg-cyber-900/60 border border-white/5 rounded-2xl p-4 h-[calc(100vh-280px)] overflow-y-auto space-y-2">
            <AnimatePresence initial={false}>
              {events.length === 0 ? (
                <div className="flex flex-col items-center justify-center h-full text-white/20">
                  <Wifi className="w-10 h-10 mb-3 opacity-30" />
                  <p className="text-sm">Waiting for threat events…</p>
                </div>
              ) : (
                events.map(ev => <ThreatItem key={ev.id ?? ev.timestamp} ev={ev} />)
              )}
            </AnimatePresence>
          </div>
        </div>

        {/* Recent anomalies */}
        <div className="bg-cyber-900/60 border border-white/5 rounded-2xl p-4">
          <h3 className="text-sm font-semibold text-white/60 mb-3">Recent Anomalies (DB)</h3>
          <div className="space-y-2 overflow-y-auto max-h-[calc(100vh-280px)]">
            {anomalies.map(a => (
              <div key={a.id} className="p-3 bg-white/3 rounded-xl border border-amber-400/10">
                <p className="text-xs font-mono text-white/70">{a.user_id}</p>
                <p className="text-[10px] text-white/35 mt-0.5 truncate">{a.reason ?? '—'}</p>
                <p className="text-[10px] text-white/20 mt-0.5">{new Date(a.timestamp).toLocaleString()}</p>
              </div>
            ))}
            {!anomalies.length && <p className="text-xs text-white/20 text-center py-4">No anomalies</p>}
          </div>
        </div>
      </div>
    </PageShell>
  );
}
