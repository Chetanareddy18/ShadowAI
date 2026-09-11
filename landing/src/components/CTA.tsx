import { motion } from 'framer-motion';
import { Shield, GitFork, ArrowRight, Zap } from 'lucide-react';
import Reveal3D from './Reveal3D';

export default function CTA() {
  return (
    <section className="py-28 px-6 relative overflow-hidden">
      {/* Giant background glow */}
      <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
        <div className="w-[800px] h-[400px] rounded-full blur-[120px]" style={{ backgroundColor: 'var(--accent-bg)' }} />
      </div>

      <div className="relative max-w-4xl mx-auto">
        <Reveal3D>
          <div
            className="relative rounded-3xl overflow-hidden text-center"
            style={{ boxShadow: 'var(--card-shadow)' }}
          >
            {/* Card bg */}
            <div
              className="absolute inset-0"
              style={{ background: 'linear-gradient(135deg, var(--accent-bg) 0%, rgba(124,58,237,0.06) 50%, var(--bg) 100%)' }}
            />
            <div className="absolute inset-0 rounded-3xl" style={{ border: '1px solid var(--border)' }} />
            <div className="absolute top-0 inset-x-0 h-px" style={{ background: 'linear-gradient(to right, transparent, var(--accent), transparent)' }} />
            <div className="absolute bottom-0 inset-x-0 h-px" style={{ background: 'linear-gradient(to right, transparent, rgba(124,58,237,0.5), transparent)' }} />

            <div className="relative px-10 py-16">
              <motion.div
                initial={{ scale: 0.7, opacity: 0 }}
                whileInView={{ scale: 1, opacity: 1 }}
                viewport={{ once: true }}
                transition={{ delay: 0.2, type: 'spring', stiffness: 200 }}
                className="w-16 h-16 rounded-2xl flex items-center justify-center mx-auto mb-7 float-3d"
                style={{
                  backgroundColor: 'var(--accent-bg)',
                  border: '1px solid var(--accent-border)',
                  boxShadow: '0 0 40px var(--accent-bg)',
                }}
              >
                <Shield className="w-7 h-7" style={{ color: 'var(--accent)' }} />
              </motion.div>

              <h2
                className="text-5xl font-black mb-4 leading-tight"
                style={{ fontFamily: "'Unbounded', sans-serif", color: 'var(--text)' }}
              >
                Secure Your AI.<br />
                <span className="bg-gradient-to-r from-cyan-400 to-violet-400 bg-clip-text text-transparent">
                  Starting Now.
                </span>
              </h2>

              <p className="mb-10 max-w-md mx-auto leading-relaxed text-[15px]" style={{ color: 'var(--muted)' }}>
                Open source, zero cost, deploys in minutes.
                Built for real enterprise AI workloads.
              </p>

              <div className="flex flex-wrap items-center justify-center gap-4 mb-10">
                <a
                  href="http://127.0.0.1:5173"
                  className="group flex items-center gap-2.5 px-8 py-4 text-black font-black text-sm rounded-2xl transition-all duration-200 hover:-translate-y-0.5"
                  style={{ backgroundColor: 'var(--accent)', boxShadow: '0 0 50px var(--accent-bg)' }}
                  onMouseEnter={e => (e.currentTarget.style.filter = 'brightness(1.15)')}
                  onMouseLeave={e => (e.currentTarget.style.filter = '')}
                >
                  <Shield className="w-4 h-4" />
                  Launch Portal
                  <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
                </a>
                <a
                  href="https://github.com" target="_blank" rel="noreferrer"
                  className="flex items-center gap-2.5 px-8 py-4 font-semibold text-sm rounded-2xl transition-all duration-200 hover:-translate-y-0.5"
                  style={{ backgroundColor: 'var(--surface)', border: '1px solid var(--border)', color: 'var(--muted)' }}
                  onMouseEnter={e => (e.currentTarget.style.color = 'var(--text)')}
                  onMouseLeave={e => (e.currentTarget.style.color = 'var(--muted)')}
                >
                  <GitFork className="w-4 h-4" />
                  Star on GitHub
                </a>
              </div>

              <div className="flex flex-wrap items-center justify-center gap-6 text-xs" style={{ color: 'var(--faint)' }}>
                {['Free forever', 'No API keys needed', 'SQLite → any DB', 'Deploy to Render in 1 click'].map(t => (
                  <span key={t} className="flex items-center gap-1.5">
                    <Zap className="w-3 h-3" style={{ color: 'var(--accent)' }} /> {t}
                  </span>
                ))}
              </div>
            </div>
          </div>
        </Reveal3D>

        <p className="text-center mt-10 text-xs" style={{ color: 'var(--faint)' }}>
          Built by Chetana — MIT License — Shadow AI v3.0
        </p>
      </div>
    </section>
  );
}


