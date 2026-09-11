import { useRef } from 'react';
import { motion, useMotionValue, useTransform, useSpring } from 'framer-motion';
import { ShieldAlert, Eye, Zap, Brain, Lock, BarChart2 } from 'lucide-react';
import Reveal3D from './Reveal3D';

const features = [
  {
    icon: ShieldAlert,
    title: 'Prompt Injection Detection',
    desc: 'Regex + ML (TF-IDF LogisticRegression) catches jailbreaks, instruction overrides, and adversarial prompts before they hit the model.',
    accent: '#f43f5e',
    tag: 'ML-Powered',
  },
  {
    icon: Eye,
    title: 'Data Leakage Prevention',
    desc: 'Scans every prompt for PII, API keys, credentials, and financial data. Redacts automatically on SANITIZE decisions.',
    accent: '#00d4ff',
    tag: 'Real-time',
  },
  {
    icon: Brain,
    title: 'Anomaly Detection',
    desc: 'IsolationForest model builds per-user behaviour profiles and raises alerts when usage deviates — catching compromised accounts silently.',
    accent: '#7c3aed',
    tag: 'IsolationForest',
  },
  {
    icon: Zap,
    title: 'Live SSE Threat Feed',
    desc: 'Server-Sent Events stream every threat event to your dashboard the instant it happens. No polling. Sub-second latency.',
    accent: '#f59e0b',
    tag: 'Sub-second',
  },
  {
    icon: Lock,
    title: 'Multi-Tenant Policies',
    desc: 'JSON security policies per organisation — block topics, set risk thresholds, customise sanitization rules independently.',
    accent: '#00ff88',
    tag: 'Per-org',
  },
  {
    icon: BarChart2,
    title: 'Full Audit Trail',
    desc: 'Every prompt, decision, risk score, and finding is logged. Paginated table, advanced filters, one-click CSV export.',
    accent: '#00d4ff',
    tag: 'Compliance-ready',
  },
];

function TiltCard({ children, accent }: { children: React.ReactNode; accent: string }) {
  const ref = useRef<HTMLDivElement>(null!);
  const mx = useMotionValue(0);
  const my = useMotionValue(0);
  const rx = useSpring(useTransform(my, [-0.5, 0.5], [8, -8]), { stiffness: 180, damping: 18 });
  const ry = useSpring(useTransform(mx, [-0.5, 0.5], [-8, 8]), { stiffness: 180, damping: 18 });

  const onMove = (e: React.MouseEvent<HTMLDivElement>) => {
    const r = ref.current.getBoundingClientRect();
    mx.set((e.clientX - r.left) / r.width - 0.5);
    my.set((e.clientY - r.top) / r.height - 0.5);
  };
  const onLeave = () => { mx.set(0); my.set(0); };

  return (
    <motion.div
      ref={ref}
      style={{ rotateX: rx, rotateY: ry, transformPerspective: 900 }}
      onMouseMove={onMove}
      onMouseLeave={onLeave}
      whileHover={{ scale: 1.02 }}
      transition={{ scale: { duration: 0.2 } }}
      className="h-full"
    >
      <div
        className="h-full p-6 rounded-2xl relative overflow-hidden transition-all duration-300 group"
        style={{
          backgroundColor: 'var(--surface)',
          border: `1px solid ${accent}22`,
          boxShadow: 'var(--card-shadow)',
        }}
        onMouseEnter={e => (e.currentTarget.style.backgroundColor = 'var(--surface-h)')}
        onMouseLeave={e => (e.currentTarget.style.backgroundColor = 'var(--surface)')}
      >
        {/* Corner glow */}
        <div
          className="absolute -top-12 -left-12 w-32 h-32 rounded-full blur-2xl opacity-0 group-hover:opacity-100 transition-opacity duration-500 pointer-events-none"
          style={{ backgroundColor: `${accent}18` }}
        />
        {children}
      </div>
    </motion.div>
  );
}

export default function Features() {
  return (
    <section id="features" className="py-28 px-6 relative">
      <div className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-white/8 to-transparent" />

      <div className="max-w-6xl mx-auto">
        <Reveal3D className="text-center mb-16">
          <span className="text-[11px] font-semibold tracking-[0.18em] uppercase mb-3 block" style={{ color: 'var(--accent)' }}>Capabilities</span>
          <h2
            className="text-4xl font-black mb-4"
            style={{ fontFamily: "'Unbounded', sans-serif", color: 'var(--text)' }}
          >
            13 Layers of AI Security
          </h2>
          <p className="max-w-md mx-auto text-sm leading-relaxed" style={{ color: 'var(--muted)' }}>
            FastAPI + scikit-learn + SQLAlchemy — production-grade, zero vendor lock-in.
          </p>
        </Reveal3D>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {features.map((f, i) => (
            <motion.div
              key={f.title}
              className={`h-full ${i % 2 === 0 ? 'float-3d' : 'float-3d-slow'}`}
              initial={{ opacity: 0, y: 24 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: i * 0.07, duration: 0.4 }}
            >
              <TiltCard accent={f.accent}>
                <div className="flex items-start justify-between mb-4">
                  <div
                    className="w-11 h-11 rounded-xl flex items-center justify-center"
                    style={{ backgroundColor: `${f.accent}18`, border: `1px solid ${f.accent}28` }}
                  >
                    <f.icon className="w-5 h-5" style={{ color: f.accent }} />
                  </div>
                  <span
                    className="text-[9px] font-bold tracking-widest uppercase px-2 py-1 rounded-full border"
                    style={{ color: f.accent, borderColor: `${f.accent}30`, backgroundColor: `${f.accent}10` }}
                  >
                    {f.tag}
                  </span>
                </div>
                <h3 className="text-[15px] font-bold mb-2 leading-snug" style={{ color: 'var(--text)' }}>{f.title}</h3>
                <p className="text-sm leading-relaxed" style={{ color: 'var(--muted)' }}>{f.desc}</p>
              </TiltCard>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
}
