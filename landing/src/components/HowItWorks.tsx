import { motion } from 'framer-motion';
import { Send, ShieldCheck, BarChart2 } from 'lucide-react';
import Reveal3D from './Reveal3D';

const steps = [
  {
    num: '01',
    Icon: Send,
    title: 'Prompt Submitted',
    desc: 'Your app POSTs to the Shadow AI gateway with an API key. Employees, services, and integrations all go through the same single endpoint.',
    accent: '#00d4ff',
  },
  {
    num: '02',
    Icon: ShieldCheck,
    title: '13-Layer Pipeline',
    desc: 'Auth → Rate limiting → Regex injection → Semantic ML → PII scan → Topic classification → Risk scoring → Policy decision → Sanitize → LLM → Response scan → Anomaly detection → Audit.',
    accent: '#7c3aed',
  },
  {
    num: '03',
    Icon: BarChart2,
    title: 'Decision + Stream',
    desc: 'You get ALLOW / SANITIZE / BLOCK with full findings JSON. Simultaneously, the event streams live to your admin threat dashboard via SSE.',
    accent: '#00ff88',
  },
];

export default function HowItWorks() {
  return (
    <section className="py-28 px-6 relative overflow-hidden">
      {/* Subtle diagonal stripe */}
      <div className="absolute inset-0 bg-[repeating-linear-gradient(135deg,transparent,transparent_60px,rgba(255,255,255,0.008)_60px,rgba(255,255,255,0.008)_61px)] pointer-events-none" />

      <div className="max-w-6xl mx-auto">
        <Reveal3D className="text-center mb-16">
          <span className="text-[11px] font-semibold tracking-[0.18em] uppercase mb-3 block" style={{ color: 'var(--accent)' }}>How It Works</span>
          <h2
            className="text-4xl font-black"
            style={{ fontFamily: "'Unbounded', sans-serif", color: 'var(--text)' }}
          >
            Zero to Secure in 3 Steps
          </h2>
        </Reveal3D>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 relative">
          {/* Connector — desktop only */}
          <div className="hidden md:block absolute top-12 left-[calc(16.67%+2rem)] right-[calc(16.67%+2rem)] h-px">
            <div className="w-full h-full bg-gradient-to-r from-cyan-400/20 via-violet-500/30 to-[#00ff88]/20" />
            {/* Animated dot */}
            <motion.div
              className="absolute top-1/2 -translate-y-1/2 w-2 h-2 rounded-full bg-cyan-400"
              animate={{ x: ['0%', '100%', '0%'] }}
              transition={{ duration: 4, repeat: Infinity, ease: 'easeInOut' }}
              style={{ left: 0 }}
            />
          </div>

          {steps.map((s, i) => (
            <motion.div
              key={s.num}
              initial={{ opacity: 0, y: 28 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: i * 0.15, duration: 0.55 }}
              className={`relative flex flex-col items-center text-center p-6 rounded-2xl transition-all float-3d${i % 2 === 1 ? '-slow' : ''}`}
              style={{ backgroundColor: 'var(--surface)', border: '1px solid var(--border)', boxShadow: 'var(--card-shadow)' }}
              whileHover={{ y: -6, transition: { duration: 0.25 } }}
            >
              {/* Number badge */}
              <div
                className="relative w-20 h-20 rounded-2xl flex items-center justify-center mb-6"
                style={{ backgroundColor: `${s.accent}14`, border: `1px solid ${s.accent}28` }}
              >
                <s.Icon className="w-7 h-7" style={{ color: s.accent }} />
                <span
                  className="absolute -top-2.5 -right-2.5 text-[10px] font-black px-2 py-0.5 rounded-full border"
                  style={{ color: s.accent, borderColor: `${s.accent}35`, backgroundColor: `${s.accent}12`, fontFamily: "'Unbounded', sans-serif" }}
                >
                  {s.num}
                </span>
              </div>
              <h3 className="text-base font-bold mb-3" style={{ color: 'var(--text)' }}>{s.title}</h3>
              <p className="text-sm leading-relaxed" style={{ color: 'var(--muted)' }}>{s.desc}</p>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
}

