import { useEffect, useState, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Download, ChevronLeft, ChevronRight } from 'lucide-react';
import { api, type AuditRow, type AuditParams } from '../lib/api';
import PageShell from '../components/PageShell';
import { DecisionBadge, RiskBadge } from '../components/Badges';
import { useSession } from '../store/session';

function relTime(iso: string) {
  const diff = Date.now() - new Date(iso).getTime();
  const m = Math.floor(diff / 60000);
  if (m < 1) return 'just now';
  if (m < 60) return `${m}m ago`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h ago`;
  return `${Math.floor(h / 24)}d ago`;
}

export default function Audit() {
  const { gatewayUrl, apiKey } = useSession();
  const [items, setItems]   = useState<AuditRow[]>([]);
  const [total, setTotal]   = useState(0);
  const [totalPages, setTotalPages] = useState(1);
  const [page, setPage]     = useState(1);
  const [loading, setLoading] = useState(true);
  const [detail, setDetail] = useState<AuditRow | null>(null);
  const [filters, setFilters] = useState<AuditParams>({ page_size: 50 });

  const load = useCallback(async (p = page, f = filters) => {
    setLoading(true);
    try {
      const clean: Record<string,string> = { page: String(p), page_size: String(f.page_size ?? 50) };
      if (f.decision)   clean.decision   = f.decision;
      if (f.risk_level) clean.risk_level = f.risk_level;
      if (f.user_id)    clean.user_id    = f.user_id;
      if (f.org_id)     clean.org_id     = f.org_id;
      if (f.topic)      clean.topic      = f.topic;
      const data = await api.audit(clean as AuditParams);
      setItems(data.items);
      setTotal(data.total);
      setTotalPages(data.total_pages);
    } finally { setLoading(false); }
  }, []);

  useEffect(() => { load(1, filters); setPage(1); }, [filters]);

  const goPage = (p: number) => { setPage(p); load(p, filters); };

  const exportCsv = async () => {
    try {
      const res = await fetch(`${gatewayUrl}/admin/export/csv?limit=1000`, { headers: { 'x-api-key': apiKey } });
      const blob = await res.blob();
      const a = document.createElement('a'); a.href = URL.createObjectURL(blob);
      a.download = 'shadow_audit.csv'; a.click();
    } catch { /* ignore */ }
  };

  const selects = [
    { label: 'Decision',   key: 'decision',   opts: ['', 'BLOCK', 'SANITIZE', 'ALLOW'] },
    { label: 'Risk',       key: 'risk_level',  opts: ['', 'CRITICAL', 'HIGH', 'MEDIUM', 'LOW'] },
    { label: 'Topic',      key: 'topic',       opts: ['', 'GENERAL', 'MEDICAL', 'FINANCIAL', 'LEGAL', 'SECURITY', 'HR', 'IP'] },
    { label: 'Page size',  key: 'page_size',   opts: ['25', '50', '100'] },
  ];

  return (
    <PageShell
      title="Audit Logs"
      subtitle={`${total.toLocaleString()} total entries`}
      actions={
        <button onClick={exportCsv}
          className="flex items-center gap-1.5 px-3 py-1.5 bg-white/5 hover:bg-white/10 text-white/60 text-xs rounded-lg border border-white/10 transition-all">
          <Download className="w-3.5 h-3.5" /> Export CSV
        </button>
      }
    >
      {/* Filters */}
      <div className="flex flex-wrap gap-2 mb-4">
        {selects.map(({ label, key, opts }) => (
          <div key={key}>
            <select
              value={String((filters as Record<string,unknown>)[key] ?? '')}
              onChange={e => setFilters(f => ({ ...f, [key]: e.target.value || undefined }))}
              className="h-8 px-2.5 bg-cyber-900/80 border border-white/10 rounded-lg text-xs text-white/70 focus:outline-none focus:border-cyan-400/50"
            >
              {opts.map(o => <option key={o} value={o}>{o || label}</option>)}
            </select>
          </div>
        ))}
        {['user_id', 'org_id'].map(key => (
          <input key={key} placeholder={key === 'user_id' ? 'User ID' : 'Org ID'}
            value={String((filters as Record<string,unknown>)[key] ?? '')}
            onChange={e => setFilters(f => ({ ...f, [key]: e.target.value || undefined }))}
            className="h-8 px-2.5 bg-cyber-900/80 border border-white/10 rounded-lg text-xs text-white/70 placeholder:text-white/25 focus:outline-none focus:border-cyan-400/50 w-28"
          />
        ))}
        <button onClick={() => setFilters({ page_size: 50 })}
          className="h-8 px-2.5 bg-white/5 hover:bg-white/10 border border-white/10 rounded-lg text-xs text-white/40 transition-all">
          Clear
        </button>
      </div>

      {/* Table */}
      <div className="bg-cyber-900/60 border border-white/5 rounded-2xl overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-white/5 text-[11px] text-white/30 uppercase tracking-wider">
                {['Time', 'User', 'Org', 'Decision', 'Risk', 'Topic', 'Anomaly', 'Len', ''].map(h => (
                  <th key={h} className="text-left px-4 py-3 font-medium whitespace-nowrap">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-white/3">
              {loading ? (
                <tr><td colSpan={9} className="text-center py-12">
                  <span className="w-6 h-6 border-2 border-cyan-400/30 border-t-cyan-400 rounded-full animate-spin inline-block" />
                </td></tr>
              ) : items.map(row => (
                <tr key={row.id} className="hover:bg-white/2 transition-colors">
                  <td className="px-4 py-2.5 text-xs text-white/30 whitespace-nowrap" title={row.timestamp}>{relTime(row.timestamp)}</td>
                  <td className="px-4 py-2.5 text-xs font-mono text-white/70 max-w-24 truncate">{row.user_id}</td>
                  <td className="px-4 py-2.5"><span className="text-[10px] bg-white/8 text-white/40 px-1.5 py-0.5 rounded">{row.org_id}</span></td>
                  <td className="px-4 py-2.5"><DecisionBadge v={row.decision} /></td>
                  <td className="px-4 py-2.5"><RiskBadge v={row.risk_level} /></td>
                  <td className="px-4 py-2.5 text-xs text-white/40">{row.topic ?? 'GENERAL'}</td>
                  <td className="px-4 py-2.5">
                    {row.is_anomalous === 'true'
                      ? <span className="text-[10px] bg-amber-400/10 text-amber-400 px-1.5 py-0.5 rounded-full">⚠ Yes</span>
                      : <span className="text-white/20 text-xs">—</span>}
                  </td>
                  <td className="px-4 py-2.5 text-xs text-white/30">{row.prompt_length}</td>
                  <td className="px-4 py-2.5 text-right">
                    <button onClick={() => setDetail(row)} className="text-[11px] text-cyan-400/60 hover:text-cyan-400 transition-colors">View</button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          {!loading && !items.length && <div className="text-center py-10 text-white/20 text-sm">No entries match filters</div>}
        </div>

        {/* Pagination */}
        {totalPages > 1 && (
          <div className="flex items-center justify-between px-4 py-3 border-t border-white/5">
            <span className="text-xs text-white/30">Page {page} of {totalPages}</span>
            <div className="flex gap-1">
              <button onClick={() => goPage(page - 1)} disabled={page <= 1}
                className="p-1.5 rounded-lg text-white/30 hover:text-white hover:bg-white/5 disabled:opacity-30 transition-all"><ChevronLeft className="w-4 h-4" /></button>
              <button onClick={() => goPage(page + 1)} disabled={page >= totalPages}
                className="p-1.5 rounded-lg text-white/30 hover:text-white hover:bg-white/5 disabled:opacity-30 transition-all"><ChevronRight className="w-4 h-4" /></button>
            </div>
          </div>
        )}
      </div>

      {/* Detail modal */}
      <AnimatePresence>
        {detail && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
              className="absolute inset-0 bg-black/70 backdrop-blur-sm" onClick={() => setDetail(null)} />
            <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.95 }}
              transition={{ duration: 0.2 }}
              className="relative z-10 w-full max-w-lg bg-cyber-900 border border-white/10 rounded-2xl p-6 shadow-2xl max-h-[80vh] overflow-y-auto">
              <div className="flex items-center justify-between mb-5">
                <h2 className="text-base font-semibold text-white">Log Detail</h2>
                <button onClick={() => setDetail(null)} className="text-white/30 hover:text-white transition-colors"><X className="w-4 h-4" /></button>
              </div>
              <div className="grid grid-cols-2 gap-3 mb-4">
                {[
                  ['Decision', <DecisionBadge v={detail.decision} />],
                  ['Risk',     <RiskBadge v={detail.risk_level} />],
                  ['User',     <span className="font-mono text-xs text-white/70">{detail.user_id}</span>],
                  ['Org',      <span className="text-xs bg-white/8 text-white/40 px-2 py-0.5 rounded">{detail.org_id}</span>],
                  ['Topic',    <span className="text-xs text-white/60">{detail.topic ?? 'GENERAL'}</span>],
                  ['Model',    <span className="text-xs text-white/60">{detail.model_used ?? '—'}</span>],
                  ['Length',   <span className="text-xs text-white/60">{detail.prompt_length} chars</span>],
                  ['Anomaly',  <span className="text-xs text-white/60">{detail.is_anomalous === 'true' ? '⚠ Yes' : 'No'}</span>],
                ].map(([k, v]) => (
                  <div key={String(k)}>
                    <p className="text-[10px] text-white/25 mb-1 uppercase tracking-wider">{k}</p>
                    {v}
                  </div>
                ))}
              </div>
              {detail.message && <p className="text-xs text-white/50 mb-3">{detail.message}</p>}
              <div>
                <p className="text-[10px] text-white/25 mb-2 uppercase tracking-wider">Findings</p>
                <pre className="text-xs font-mono text-green-400 bg-black/40 border border-white/5 rounded-xl p-3 overflow-x-auto whitespace-pre-wrap">
                  {JSON.stringify(detail.findings ?? {}, null, 2)}
                </pre>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </PageShell>
  );
}
