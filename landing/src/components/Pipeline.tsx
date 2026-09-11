import { useState, useEffect, useRef } from 'react';
import { motion, useInView, AnimatePresence } from 'framer-motion';
import Reveal3D from './Reveal3D';

const LAYERS = [
  { name: 'Auth',          color: '#00d4ff', group: 'access' },
  { name: 'Rate Limit',    color: '#00d4ff', group: 'access' },
  { name: 'Regex Scan',    color: '#f43f5e', group: 'detect' },
  { name: 'Semantic ML',   color: '#7c3aed', group: 'detect' },
  { name: 'PII Scanner',   color: '#f59e0b', group: 'detect' },
  { name: 'Topic Class.',  color: '#00d4ff', group: 'enrich' },
  { name: 'Risk Score',    color: '#f43f5e', group: 'enrich' },
  { name: 'Policy Eval.',  color: '#7c3aed', group: 'decide' },
  { name: 'Sanitize',      color: '#f59e0b', group: 'decide' },
  { name: 'LLM Call',      color: '#00ff88', group: 'process'},
  { name: 'Response Scan', color: '#f43f5e', group: 'process'},
  { name: 'Anomaly Det.',  color: '#7c3aed', group: 'audit'  },
  { name: 'Audit Log',     color: '#00d4ff', group: 'audit'  },
];

const DECISIONS = [
  { label: 'ALLOW',    cls: 'border-emerald-400/40 bg-emerald-400/10 text-emerald-300' },
  { label: 'SANITIZE', cls: 'border-amber-400/40   bg-amber-400/10   text-amber-300'   },
  { label: 'BLOCK',    cls: 'border-rose-500/40    bg-rose-500/10    text-rose-300'     },
];

export default function Pipeline() {
  const ref = useRef<HTMLDivElement>(null!);
  const inView = useInView(ref, { once: false, margin: '-100px' });

  const [active, setActive] = useState(-1);
  const [decision, setDecision] = useState<number | null>(null);

  useEffect(() => {
    if (!inView) return;
    let t: ReturnType<typeof setTimeout>;
    let running = true;

    const run = () => {
      if (!running) return;
      setDecision(null);
      setActive(-1);
      let i = 0;
      const step = () => {
        if (!running) return;
        if (i < LAYERS.length) {
          setActive(i++);
          t = setTimeout(step, 160);
        } else {
          setActive(-1);
          const pick = Math.floor(Math.random() * 3);
          setDecision(pick);
          t = setTimeout(run, 2800);
        }
      };
      t = setTimeout(step, 400);
    };

    run();
    return () => { running = false; clearTimeout(t); };
  }, [inView]);

  return (
    <section id="pipeline" className="py-24 px-6 relative" ref={ref}>
      {/* Section glow */}
      <div className="absolute inset-0 bg-gradient-to-b from-transparent via-violet-500/[0.03] to-transparent pointer-events-none" />

      <div className="max-w-6xl mx-auto">
        <Reveal3D className="text-center mb-14">
          <span className="text-[11px] font-semibold tracking-[0.18em] uppercase mb-3 block" style={{ color: '#7c3aed' }}>Live Pipeline</span>
          <h2
            className="text-4xl font-black mb-3"
            style={{ fontFamily: "'Unbounded', sans-serif", color: 'var(--text)' }}
          >
            Every Prompt. 13 Checks.
          </h2>
          <p className="text-sm max-w-md mx-auto" style={{ color: 'var(--muted)' }}>
            Watch a prompt travel through the full security pipeline in real-time.
          </p>
        </Reveal3D>

        {/* Pipeline grid */}
        <div className="relative">
          {/* Prompt input pill */}
          <motion.div
            initial={{ opacity: 0, x: -20 }}
            whileInView={{ opacity: 1, x: 0 }}
            viewport={{ once: true }}
            className="flex items-center justify-center mb-8"
          >
            <div
              className="flex items-center gap-3 px-5 py-3 rounded-2xl"
              style={{ backgroundColor: 'var(--surface)', border: '1px solid var(--border)' }}
            >
              <span className="text-xs font-mono" style={{ color: 'var(--faint)' }}>POST /process</span>
              <span className="w-px h-4" style={{ backgroundColor: 'var(--border)' }} />
              <span className="text-xs font-mono" style={{ color: 'var(--accent)' }}>"Ignore all previous instructions…"</span>
              <span className="w-2 h-2 rounded-full animate-pulse" style={{ backgroundColor: 'var(--accent)' }} />
            </div>
          </motion.div>

          {/* Arrow down */}
          <div className="flex justify-center mb-4">
            <div className="w-px h-6 bg-gradient-to-b from-cyan-400/40 to-transparent" />
          </div>

          {/* Layers grid — 7 + 6 */}
          <div className="space-y-3">
            {[LAYERS.slice(0, 7), LAYERS.slice(7)].map((row, ri) => (
              <div key={ri} className="grid gap-2" style={{ gridTemplateColumns: `repeat(${row.length}, 1fr)` }}>
                {row.map((layer, li) => {
                  const idx = ri * 7 + li;
                  const isActive = active === idx;
                  const wasDone = active > idx || (decision !== null && active === -1);
                  return (
                    <motion.div
                      key={layer.name}
                      initial={{ opacity: 0, y: 12 }}
                      whileInView={{ opacity: 1, y: 0 }}
                      viewport={{ once: true }}
                      transition={{ delay: idx * 0.04, duration: 0.35 }}
                      className={[
                        'relative px-2.5 py-3 rounded-xl border text-center text-[11px] font-semibold transition-all duration-200',
                        isActive ? 'scale-[1.08]' : '',
                      ].join(' ')}
                      style={{
                        borderColor: isActive ? layer.color : 'var(--border)',
                        color: isActive ? layer.color : wasDone ? layer.color : 'var(--faint)',
                        backgroundColor: isActive ? 'var(--surface-h)' : 'var(--surface)',
                        opacity: wasDone && !isActive ? 0.6 : 1,
                        boxShadow: isActive ? `0 0 20px ${layer.color}40` : 'var(--card-shadow)',
                      }}
                    >
                      {isActive && (
                        <span
                          className="absolute inset-0 rounded-xl animate-ping opacity-20"
                          style={{ backgroundColor: layer.color }}
                        />
                      )}
                      <span className="text-[9px] opacity-40 block mb-0.5">{String(idx + 1).padStart(2, '0')}</span>
                      {layer.name}
                    </motion.div>
                  );
                })}
              </div>
            ))}
          </div>

          {/* Arrow down */}
          <div className="flex justify-center mt-4 mb-6">
            <div className="w-px h-8 bg-gradient-to-b from-white/20 to-transparent" />
          </div>

          {/* Decision output */}
          <div className="flex justify-center">
            <AnimatePresence mode="wait">
              {decision !== null ? (
                <motion.div
                  key={decision}
                  initial={{ opacity: 0, scale: 0.85, y: 8 }}
                  animate={{ opacity: 1, scale: 1, y: 0 }}
                  exit={{ opacity: 0, scale: 0.85 }}
                  className={`px-8 py-3.5 border rounded-2xl font-black text-sm tracking-widest uppercase ${DECISIONS[decision].cls}`}
                  style={{ fontFamily: "'Unbounded', sans-serif" }}
                >
                  {DECISIONS[decision].label}
                </motion.div>
              ) : (
                <motion.div
                  key="processing"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  className="px-8 py-3.5 border border-white/8 rounded-2xl text-white/20 text-xs font-mono"
                >
                  processing…
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </div>
      </div>
    </section>
  );
}
