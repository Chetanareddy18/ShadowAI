import { useRef, useState, useEffect } from 'react';
import { useInView } from 'framer-motion';

const STATS = [
  { to: 13,   suffix: '',   label: 'Security Layers',      hex: '#00d4ff' },
  { to: 99.9, suffix: '%',  label: 'Detection Accuracy',   hex: '#7c3aed' },
  { to: 5,    suffix: 'ms', label: 'Avg Response Time',    hex: '#00ff88' },
  { to: 100,  suffix: '%',  label: 'Open Source & Free',   hex: '#f59e0b' },
];

function CountUp({ to, suffix, active }: { to: number; suffix: string; active: boolean }) {
  const [count, setCount] = useState(0);
  useEffect(() => {
    if (!active) return;
    let start = 0;
    const duration = 1400;
    const step = (ts: number) => {
      if (!start) start = ts;
      const progress = Math.min((ts - start) / duration, 1);
      const eased = 1 - Math.pow(1 - progress, 3);
      setCount(Math.round(eased * to * 10) / 10);
      if (progress < 1) requestAnimationFrame(step);
      else setCount(to);
    };
    requestAnimationFrame(step);
  }, [active, to]);
  return <>{count}{suffix}</>;
}

export default function Stats() {
  const ref = useRef<HTMLDivElement>(null!);
  const inView = useInView(ref, { once: true, margin: '-80px' });

  return (
    <section ref={ref} className="py-16 px-6 relative overflow-hidden">
      <div className="absolute inset-x-0 top-0 h-px" style={{ background: 'linear-gradient(to right, transparent, var(--accent-border), transparent)' }} />
      <div className="absolute inset-x-0 bottom-0 h-px" style={{ background: 'linear-gradient(to right, transparent, var(--border), transparent)' }} />

      <div
        className="relative max-w-5xl mx-auto grid grid-cols-2 lg:grid-cols-4 gap-px rounded-3xl overflow-hidden"
        style={{ backgroundColor: 'var(--border)', boxShadow: 'var(--card-shadow)' }}
      >
        {STATS.map(({ to, suffix, label, hex }) => (
          <div
            key={label}
            className="float-3d px-8 py-8 flex flex-col items-center text-center"
            style={{ backgroundColor: 'var(--bg)' }}
          >
            <p
              className="text-4xl font-extrabold drop-shadow-lg mb-2"
              style={{ fontFamily: "'Unbounded', sans-serif", color: hex }}
            >
              <CountUp to={to} suffix={suffix} active={inView} />
            </p>
            <p className="text-xs tracking-wide" style={{ color: 'var(--faint)' }}>{label}</p>
          </div>
        ))}
      </div>
    </section>
  );
}
