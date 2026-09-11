import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { AreaChart, Area, ResponsiveContainer, Tooltip, XAxis } from 'recharts';
import { motion } from 'framer-motion';
import { ShieldAlert, ShieldCheck, ShieldOff, Activity, TrendingUp } from 'lucide-react';
import { api, type StatsResponse } from '../lib/api';
import PageShell from '../components/PageShell';
import { useSession } from '../store/session';

interface KpiCardProps {
  label: string;
  value: number;
  icon: React.ReactNode;
  color: string;
  delay?: number;
}

function KpiCard({ label, value, icon, color, delay = 0 }: KpiCardProps) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay, duration: 0.3 }}
      className={`bg-cyber-900/60 border border-white/5 rounded-2xl p-5 flex items-start justify-between hover:border-white/10 transition-all group`}
    >
      <div>
        <p className="text-xs text-white/40 font-medium mb-1">{label}</p>
        <p className={`text-3xl font-bold ${color}`}>{value.toLocaleString()}</p>
      </div>
      <div className={`p-2.5 rounded-xl bg-white/5 ${color} group-hover:scale-110 transition-transform`}>
        {icon}
      </div>
    </motion.div>
  );
}

function DonutChart({ data }: { data: Record<string, number> }) {
  const total = Object.values(data).reduce((a, b) => a + b, 0);
  const colors: Record<string, string> = { BLOCK: '#f43f5e', SANITIZE: '#fbbf24', ALLOW: '#00e5a0' };
  let offset = 0;

  if (!total) return <div className="text-white/20 text-sm text-center py-8">No data yet</div>;

  return (
    <svg viewBox="0 0 100 100" className="w-36 h-36">
      {Object.entries(data).map(([key, val]) => {
        const pct   = val / total;
        const dash  = pct * 251.2;
        const gap   = 251.2 - dash;
        const rot   = offset * 360;
        offset += pct;
        return (
          <circle
            key={key}
            r="40" cx="50" cy="50" fill="none"
            stroke={colors[key] ?? '#8b5cf6'} strokeWidth="12"
            strokeDasharray={`${dash} ${gap}`}
            strokeDashoffset={0}
            transform={`rotate(${rot - 90} 50 50)`}
          />
        );
      })}
      <text x="50" y="53" textAnchor="middle" fill="white" fontSize="9" fontWeight="700">{total.toLocaleString()}</text>
      <text x="50" y="62" textAnchor="middle" fill="rgba(255,255,255,0.35)" fontSize="5.5">total</text>
    </svg>
  );
}

export default function Dashboard() {
  const { isAdmin } = useSession();
  const navigate = useNavigate();
  const [stats, setStats] = useState<StatsResponse | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!isAdmin) { navigate('/chat'); return; }
    const load = async () => {
      try {
        const s = await api.stats();
        setStats(s);
      } finally {
        setLoading(false);
      }
    };
    load();
    const id = setInterval(load, 30_000);
    return () => clearInterval(id);
  }, []);

  if (loading) return (
    <PageShell title="Dashboard">
      <div className="flex items-center justify-center h-64">
        <span className="w-8 h-8 border-2 border-cyan-400/30 border-t-cyan-400 rounded-full animate-spin" />
      </div>
    </PageShell>
  );

  const s = stats!;
  const riskData = Object.entries(s.by_risk ?? {}).map(([name, value]) => ({ name, value }));
  const topicData = Object.entries(s.by_topic ?? {}).map(([name, value]) => ({ name, value }));
  const maxRisk  = Math.max(...riskData.map(d => d.value), 1);

  const riskColor: Record<string, string> = {
    CRITICAL: 'bg-rose-500', HIGH: 'bg-amber-400', MEDIUM: 'bg-violet-500', LOW: 'bg-cyan-400',
  };

  return (
    <PageShell title="Dashboard" subtitle="Real-time security overview">
      {/* KPIs */}
      <div className="grid grid-cols-2 lg:grid-cols-5 gap-3 mb-6">
        <KpiCard label="Total Requests"  value={s.total_requests}     icon={<Activity className="w-4 h-4" />}    color="text-cyan-400"   delay={0}   />
        <KpiCard label="Blocked"         value={s.blocked}            icon={<ShieldOff className="w-4 h-4" />}   color="text-rose-400"   delay={0.05}/>
        <KpiCard label="Sanitized"       value={s.sanitized}          icon={<ShieldAlert className="w-4 h-4" />} color="text-amber-400"  delay={0.1} />
        <KpiCard label="Allowed"         value={s.allowed}            icon={<ShieldCheck className="w-4 h-4" />} color="text-mint-400"   delay={0.15}/>
        <KpiCard label="Anomalies"       value={s.anomalies_detected} icon={<TrendingUp className="w-4 h-4" />}  color="text-violet-400" delay={0.2} />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {/* Decision breakdown */}
        <motion.div
          initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.25 }}
          className="bg-cyber-900/60 border border-white/5 rounded-2xl p-5"
        >
          <h2 className="text-sm font-semibold text-white/70 mb-4">Decision Breakdown</h2>
          <div className="flex items-center justify-center gap-6">
            <DonutChart data={s.by_decision ?? {}} />
            <div className="space-y-2">
              {Object.entries(s.by_decision ?? {}).map(([k, v]) => (
                <div key={k} className="flex items-center gap-2 text-sm">
                  <span className={`w-2.5 h-2.5 rounded-full ${k === 'BLOCK' ? 'bg-rose-500' : k === 'SANITIZE' ? 'bg-amber-400' : 'bg-mint-400'}`} />
                  <span className="text-white/50 text-xs">{k}</span>
                  <span className="text-white font-medium text-xs ml-auto">{v}</span>
                </div>
              ))}
            </div>
          </div>
        </motion.div>

        {/* Risk levels */}
        <motion.div
          initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.3 }}
          className="bg-cyber-900/60 border border-white/5 rounded-2xl p-5"
        >
          <h2 className="text-sm font-semibold text-white/70 mb-4">Risk Levels</h2>
          <div className="space-y-3">
            {riskData.map(({ name, value }) => (
              <div key={name}>
                <div className="flex justify-between text-xs mb-1">
                  <span className="text-white/50">{name}</span>
                  <span className="text-white font-medium">{value}</span>
                </div>
                <div className="h-1.5 bg-white/5 rounded-full overflow-hidden">
                  <motion.div
                    initial={{ width: 0 }}
                    animate={{ width: `${(value / maxRisk) * 100}%` }}
                    transition={{ duration: 0.6, delay: 0.4 }}
                    className={`h-full rounded-full ${riskColor[name] ?? 'bg-cyan-400'}`}
                  />
                </div>
              </div>
            ))}
          </div>
        </motion.div>

        {/* Topic distribution */}
        <motion.div
          initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.35 }}
          className="bg-cyber-900/60 border border-white/5 rounded-2xl p-5"
        >
          <h2 className="text-sm font-semibold text-white/70 mb-4">Topics</h2>
          <ResponsiveContainer width="100%" height={160}>
            <AreaChart data={topicData} margin={{ top: 0, right: 0, left: -30, bottom: 0 }}>
              <defs>
                <linearGradient id="tg" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%"  stopColor="#11d4d6" stopOpacity={0.3}/>
                  <stop offset="95%" stopColor="#11d4d6" stopOpacity={0}/>
                </linearGradient>
              </defs>
              <XAxis dataKey="name" tick={{ fontSize: 9, fill: 'rgba(255,255,255,0.3)' }} />
              <Tooltip
                contentStyle={{ background: '#050f1a', border: '1px solid rgba(255,255,255,0.08)', borderRadius: 8, fontSize: 11 }}
                labelStyle={{ color: 'rgba(255,255,255,0.6)' }}
                itemStyle={{ color: '#11d4d6' }}
              />
              <Area type="monotone" dataKey="value" stroke="#11d4d6" strokeWidth={2} fill="url(#tg)" />
            </AreaChart>
          </ResponsiveContainer>
        </motion.div>
      </div>
    </PageShell>
  );
}
