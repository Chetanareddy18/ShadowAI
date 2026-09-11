import { useRef, Suspense, useMemo } from 'react';
import { Canvas, useFrame } from '@react-three/fiber';
import { Stars, MeshDistortMaterial, Sparkles } from '@react-three/drei';
import * as THREE from 'three';
import { motion } from 'framer-motion';
import { Shield, ArrowRight, GitFork, ShieldX, ShieldAlert, ShieldCheck } from 'lucide-react';
import { useTheme } from '../contexts/ThemeContext';

// ─── Orbital ring of particles ───────────────────────────────────────────────
function OrbitalRing({ radius, count, inclination, speed, color, size }: {
  radius: number; count: number; inclination: number; speed: number; color: string; size: number;
}) {
  const pointsRef = useRef<THREE.Points>(null!);
  const geometry = useMemo(() => {
    const pos = new Float32Array(count * 3);
    for (let i = 0; i < count; i++) {
      const a = (i / count) * Math.PI * 2;
      const r = radius + (Math.random() - 0.5) * 0.05;
      pos[i * 3]     = Math.cos(a) * r;
      pos[i * 3 + 1] = (Math.random() - 0.5) * 0.04;
      pos[i * 3 + 2] = Math.sin(a) * r;
    }
    const geo = new THREE.BufferGeometry();
    geo.setAttribute('position', new THREE.BufferAttribute(pos, 3));
    return geo;
  }, [radius, count]);

  useFrame(({ clock }) => {
    if (pointsRef.current) pointsRef.current.rotation.y = clock.getElapsedTime() * speed;
  });

  return (
    <group rotation={[inclination, 0, 0]}>
      <points ref={pointsRef} geometry={geometry}>
        <pointsMaterial color={color} size={size} transparent opacity={0.85} sizeAttenuation />
      </points>
    </group>
  );
}

// ─── Core torus knot + rings + parallax ──────────────────────────────────────
function Scene({ isDark }: { isDark: boolean }) {
  const groupRef  = useRef<THREE.Group>(null!);
  const knotRef   = useRef<THREE.Mesh>(null!);
  const wireRef   = useRef<THREE.Mesh>(null!);

  // Theme-based palette
  const C = isDark
    ? { knot: '#00d4ff', emissive: '#001a33', wire: '#00d4ff', aura: '#00d4ff',
        r1: '#00d4ff', r2: '#7c3aed', r3: '#00ff88', r4: '#f59e0b', r5: '#f43f5e',
        sparkle: '#00d4ff' }
    : { knot: '#1a5fb4', emissive: '#0a1f3a', wire: '#1a5fb4', aura: '#3584e4',
        r1: '#1a5fb4', r2: '#6039be', r3: '#26a269', r4: '#c17d00', r5: '#c64545',
        sparkle: '#3584e4' };

  useFrame(({ clock, mouse }) => {
    const t = clock.getElapsedTime();
    groupRef.current.rotation.y += (mouse.x * 0.45 - groupRef.current.rotation.y) * 0.04;
    groupRef.current.rotation.x += (-mouse.y * 0.25 - groupRef.current.rotation.x) * 0.04;
    if (knotRef.current) {
      knotRef.current.rotation.z = t * 0.18;
      knotRef.current.rotation.x = t * 0.12;
    }
    if (wireRef.current) {
      wireRef.current.rotation.z = -t * 0.10;
      wireRef.current.rotation.x = -t * 0.08;
    }
  });

  return (
    <group ref={groupRef}>
      {/* ── Torus knot (solid, metallic, glowing) ── */}
      <mesh ref={knotRef}>
        <torusKnotGeometry args={[0.95, 0.28, 220, 20, 2, 3]} />
        <MeshDistortMaterial
          color={C.knot}
          emissive={C.emissive}
          emissiveIntensity={isDark ? 0.9 : 0.5}
          distort={0.06}
          speed={2.5}
          metalness={isDark ? 1 : 0.7}
          roughness={isDark ? 0.05 : 0.15}
        />
      </mesh>

      {/* ── Wireframe overlay ── */}
      <mesh ref={wireRef}>
        <torusKnotGeometry args={[1.0, 0.30, 80, 10, 2, 3]} />
        <meshBasicMaterial color={C.wire} wireframe transparent opacity={isDark ? 0.07 : 0.12} />
      </mesh>

      {/* ── Outer aura ── */}
      <mesh>
        <sphereGeometry args={[1.6, 32, 32]} />
        <meshBasicMaterial color={C.aura} transparent opacity={isDark ? 0.025 : 0.05} side={THREE.BackSide} />
      </mesh>

      {/* ── 5 orbital rings ── */}
      <OrbitalRing radius={2.1} count={320} inclination={0}              speed={0.40}  color={C.r1} size={0.022} />
      <OrbitalRing radius={2.4} count={260} inclination={Math.PI / 3}    speed={-0.30} color={C.r2} size={0.019} />
      <OrbitalRing radius={2.7} count={210} inclination={Math.PI * 2/3}  speed={0.25}  color={C.r3} size={0.017} />
      <OrbitalRing radius={2.3} count={180} inclination={Math.PI / 5}    speed={-0.20} color={C.r4} size={0.015} />
      <OrbitalRing radius={2.6} count={150} inclination={Math.PI * 4/5}  speed={0.15}  color={C.r5} size={0.013} />

      {/* ── Sparkles ── */}
      <Sparkles count={isDark ? 70 : 40} scale={7} size={isDark ? 1.2 : 0.8} speed={0.25} color={C.sparkle} opacity={isDark ? 0.25 : 0.15} />
    </group>
  );
}

// ─── Floating threat notification ────────────────────────────────────────────
function ThreatBadge({ label, type, delay, style }: {
  label: string;
  type: 'block' | 'sanitize' | 'allow';
  delay: number;
  style: React.CSSProperties;
}) {
  const cfg = {
    block:    { cls: 'border-rose-500/40 bg-rose-500/10 text-rose-300',    dot: 'bg-rose-400',    Icon: ShieldX },
    sanitize: { cls: 'border-amber-400/40 bg-amber-400/10 text-amber-300', dot: 'bg-amber-400',   Icon: ShieldAlert },
    allow:    { cls: 'border-emerald-400/40 bg-emerald-400/10 text-emerald-300', dot: 'bg-emerald-400', Icon: ShieldCheck },
  }[type];

  return (
    <motion.div
      className={`absolute hidden lg:flex items-center gap-2 px-3 py-2 border rounded-xl backdrop-blur-md text-xs font-mono select-none pointer-events-none ${cfg.cls}`}
      style={style}
      initial={{ opacity: 0, scale: 0.8, y: 12 }}
      animate={{ opacity: [0, 1, 1, 1, 0], scale: [0.8, 1, 1, 1, 0.9], y: [12, 0, 0, -4, -10] }}
      transition={{ delay, duration: 3.5, repeat: Infinity, repeatDelay: 5, ease: 'easeInOut' }}
    >
      <cfg.Icon className="w-3 h-3" />
      <span className={`w-1.5 h-1.5 rounded-full ${cfg.dot} animate-pulse`} />
      {label}
    </motion.div>
  );
}

// ─── Hero section ─────────────────────────────────────────────────────────────

export default function Hero() {
  const { theme } = useTheme();
  const isDark = theme === 'dark';

  return (
    <section className="relative min-h-screen flex items-center overflow-hidden">

      {/* Dot-grid background */}
      <div className="absolute inset-0 hero-dot-grid z-0 pointer-events-none" />

      {/* Radial colour glow behind the 3D object */}
      <div
        className="absolute right-[10%] top-1/2 -translate-y-1/2 w-[700px] h-[700px] rounded-full blur-[140px] z-0 pointer-events-none"
        style={{ backgroundColor: isDark ? 'rgba(0,212,255,0.05)' : 'rgba(26,95,180,0.08)' }}
      />
      <div
        className="absolute right-[25%] top-1/2 -translate-y-1/2 w-[350px] h-[350px] rounded-full blur-[90px] z-0 pointer-events-none"
        style={{ backgroundColor: isDark ? 'rgba(124,58,237,0.08)' : 'rgba(96,57,190,0.06)' }}
      />

      {/* Three.js canvas — full bleed */}
      <div className="absolute inset-0 z-0">
        <Canvas camera={{ position: [0, 0, 6.5], fov: 45 }} gl={{ antialias: true, alpha: true }}>
          {isDark ? (
            <>
              <ambientLight intensity={0.15} />
              <pointLight position={[5, 4, 4]}   intensity={4}   color="#00d4ff" />
              <pointLight position={[-4, -3, 2]}  intensity={2.5} color="#7c3aed" />
              <pointLight position={[0, -5, -3]}  intensity={1.8} color="#00ff88" />
              <Stars radius={120} depth={60} count={5000} factor={3} fade speed={0.3} />
            </>
          ) : (
            <>
              <ambientLight intensity={0.5} color="#e8f0ff" />
              <pointLight position={[5, 4, 4]}   intensity={3}   color="#3584e4" />
              <pointLight position={[-4, -3, 2]}  intensity={1.5} color="#6039be" />
              <pointLight position={[0, 4, 4]}    intensity={2}   color="#ffffff" />
            </>
          )}
          <Suspense fallback={null}>
            <Scene isDark={isDark} />
          </Suspense>
        </Canvas>
      </div>

      {/* L→R fade so text is readable */}
      <div
        className="absolute inset-0 z-10 pointer-events-none"
        style={{
          background: isDark
            ? 'linear-gradient(to right, #020812 0%, rgba(2,8,18,0.88) 52%, transparent 100%)'
            : 'linear-gradient(to right, #f4f8ff 0%, rgba(244,248,255,0.90) 50%, transparent 100%)',
        }}
      />
      {/* Bottom fade */}
      <div
        className="absolute bottom-0 inset-x-0 h-40 z-10 pointer-events-none"
        style={{
          background: isDark
            ? 'linear-gradient(to top, #020812, transparent)'
            : 'linear-gradient(to top, #f4f8ff, transparent)',
        }}
      />

      {/* Horizontal scan-line shimmer (dark only via CSS) */}
      <div className="scanline-shimmer absolute inset-0 z-10 pointer-events-none" />

      {/* Floating live-threat badges */}
      <ThreatBadge label="BLOCKED · prompt injection"    type="block"    delay={0.6} style={{ left: '53%', top: '22%' }} />
      <ThreatBadge label="SANITIZED · PII redacted"      type="sanitize" delay={3.0} style={{ left: '60%', top: '55%' }} />
      <ThreatBadge label="ALLOWED · clean prompt"        type="allow"    delay={5.4} style={{ left: '56%', top: '72%' }} />

      {/* ── Main content ── */}
      <div className="relative z-20 w-full max-w-6xl mx-auto px-6 pt-28 pb-20">
        <div className="grid lg:grid-cols-[1fr_auto] gap-12 items-center">

          {/* LEFT — text */}
          <div className="max-w-[560px]">

            {/* Eyebrow badge */}
            <motion.div
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.45 }}
              className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full text-[11px] font-semibold tracking-[0.14em] uppercase mb-7"
              style={{ backgroundColor: 'var(--accent-bg)', border: '1px solid var(--accent-border)', color: 'var(--accent)' }}
            >
              <span className="w-1.5 h-1.5 rounded-full animate-pulse" style={{ backgroundColor: 'var(--accent)' }} />
              AI Security Gateway — Open Source
            </motion.div>

            {/* ── Refined headline — elegant, not chunky ── */}
            <motion.div
              initial={{ opacity: 0, y: 24 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.15, duration: 0.6, ease: [0.22, 1, 0.36, 1] }}
              className="mb-6"
            >
              {/* Line 1: lightweight */}
              <p
                className="text-[clamp(1.3rem,3vw,1.75rem)] font-medium tracking-wide mb-1"
                style={{ color: 'var(--muted)', fontFamily: "'Space Grotesk', sans-serif", letterSpacing: '0.04em' }}
              >
                Enterprise AI Security
              </p>
              {/* Line 2: bold brand statement */}
              <h1
                className="text-[clamp(2.6rem,6.5vw,4.5rem)] font-black leading-[1.05] tracking-tight"
                style={{ fontFamily: "'Space Grotesk', sans-serif", color: 'var(--text)' }}
              >
                Guard every prompt.{' '}
                <span
                  className="bg-gradient-to-r from-cyan-400 to-violet-500 bg-clip-text text-transparent"
                  style={{ fontStyle: 'italic' }}
                >
                  Before it's too late.
                </span>
              </h1>
            </motion.div>

            {/* Subtitle */}
            <motion.p
              initial={{ opacity: 0, y: 14 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.35, duration: 0.5 }}
              className="text-[1.05rem] leading-relaxed mb-9 max-w-[470px]"
              style={{ color: 'var(--muted)' }}
            >
              A 13-layer pipeline — injection detection, PII scanning, anomaly scoring,
              live SSE threat stream — all before any prompt reaches a model.
            </motion.p>

            {/* CTAs */}
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.5 }}
              className="flex flex-wrap gap-3 mb-10"
            >
              <a
                href="http://127.0.0.1:5173"
                className="group flex items-center gap-2.5 px-6 py-3 text-black font-bold text-sm rounded-xl transition-all duration-200 hover:-translate-y-0.5"
                style={{ backgroundColor: 'var(--accent)', boxShadow: '0 4px 24px var(--accent-bg)' }}
                onMouseEnter={e => (e.currentTarget.style.filter = 'brightness(1.1)')}
                onMouseLeave={e => (e.currentTarget.style.filter = '')}
              >
                <Shield className="w-4 h-4" />
                Open Live Portal
                <ArrowRight className="w-3.5 h-3.5 group-hover:translate-x-1 transition-transform" />
              </a>
              <a
                href="https://github.com" target="_blank" rel="noreferrer"
                className="flex items-center gap-2.5 px-6 py-3 font-semibold text-sm rounded-xl transition-all duration-200 hover:-translate-y-0.5"
                style={{ backgroundColor: 'var(--surface)', border: '1px solid var(--border)', color: 'var(--muted)' }}
                onMouseEnter={e => (e.currentTarget.style.color = 'var(--text)')}
                onMouseLeave={e => (e.currentTarget.style.color = 'var(--muted)')}
              >
                <GitFork className="w-4 h-4" />
                GitHub
              </a>
            </motion.div>

            {/* Quick stats */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.7 }}
              className="flex items-center gap-7 pt-6"
              style={{ borderTop: '1px solid var(--border)' }}
            >
              {[
                { val: '13',    label: 'Layers'       },
                { val: '< 5ms', label: 'Latency'      },
                { val: '100%',  label: 'Open Source'  },
              ].map(({ val, label }) => (
                <div key={label}>
                  <p
                    className="text-[1.5rem] font-extrabold leading-none"
                    style={{ color: 'var(--accent)' }}
                  >
                    {val}
                  </p>
                  <p className="text-[11px] mt-0.5 tracking-wide" style={{ color: 'var(--faint)' }}>{label}</p>
                </div>
              ))}
            </motion.div>
          </div>

          {/* RIGHT — product preview card */}
          <motion.div
            initial={{ opacity: 0, x: 30, rotateY: -8 }}
            animate={{ opacity: 1, x: 0, rotateY: 0 }}
            transition={{ delay: 0.6, duration: 0.8, ease: [0.22, 1, 0.36, 1] }}
            className="hidden lg:block relative"
            style={{ perspective: '900px' }}
          >
            <div
              className="w-[300px] rounded-2xl overflow-hidden"
              style={{
                backgroundColor: isDark ? '#05101c' : '#ffffff',
                border: '1px solid var(--border)',
                boxShadow: isDark
                  ? '0 0 0 1px rgba(0,212,255,0.08), 0 32px 80px rgba(0,0,0,0.6)'
                  : '0 8px 40px rgba(0,80,160,0.12), 0 2px 8px rgba(0,0,0,0.06)',
              }}
            >
              {/* Fake window chrome */}
              <div
                className="flex items-center gap-1.5 px-4 py-3"
                style={{ borderBottom: '1px solid var(--border)', backgroundColor: isDark ? '#020812' : '#f8faff' }}
              >
                <span className="w-2.5 h-2.5 rounded-full bg-rose-400/70" />
                <span className="w-2.5 h-2.5 rounded-full bg-amber-400/70" />
                <span className="w-2.5 h-2.5 rounded-full bg-emerald-400/70" />
                <span className="ml-2 text-[10px] font-mono" style={{ color: 'var(--faint)' }}>shadowai / dashboard</span>
              </div>

              {/* KPI row */}
              <div className="grid grid-cols-3 gap-px p-3" style={{ backgroundColor: 'var(--border)' }}>
                {[
                  { label: 'Total',   val: '1,284', color: '#00d4ff' },
                  { label: 'Blocked', val: '93',    color: '#f43f5e' },
                  { label: 'Allowed', val: '1,191', color: '#00ff88' },
                ].map(k => (
                  <div key={k.label} className="px-3 py-3" style={{ backgroundColor: isDark ? '#050f1a' : '#ffffff' }}>
                    <p className="text-[10px] mb-1" style={{ color: 'var(--faint)' }}>{k.label}</p>
                    <p className="text-lg font-black" style={{ color: k.color }}>{k.val}</p>
                  </div>
                ))}
              </div>

              {/* Fake bar chart */}
              <div className="px-4 py-3">
                <p className="text-[10px] mb-2" style={{ color: 'var(--faint)' }}>Risk distribution</p>
                <div className="space-y-1.5">
                  {[
                    { label: 'CRITICAL', pct: 8,  color: '#f43f5e' },
                    { label: 'HIGH',     pct: 22, color: '#f59e0b' },
                    { label: 'MEDIUM',   pct: 45, color: '#7c3aed' },
                    { label: 'LOW',      pct: 25, color: '#00d4ff' },
                  ].map(b => (
                    <div key={b.label} className="flex items-center gap-2">
                      <span className="text-[9px] w-14 font-mono" style={{ color: 'var(--faint)' }}>{b.label}</span>
                      <div className="flex-1 h-1.5 rounded-full" style={{ backgroundColor: 'var(--border)' }}>
                        <motion.div
                          className="h-full rounded-full"
                          style={{ backgroundColor: b.color }}
                          initial={{ width: 0 }}
                          animate={{ width: `${b.pct}%` }}
                          transition={{ delay: 1.2, duration: 0.8, ease: 'easeOut' }}
                        />
                      </div>
                      <span className="text-[9px] w-6 text-right" style={{ color: 'var(--faint)' }}>{b.pct}%</span>
                    </div>
                  ))}
                </div>
              </div>

              {/* Live feed row */}
              <div className="px-4 pb-4">
                <p className="text-[10px] mb-2" style={{ color: 'var(--faint)' }}>Live threat feed</p>
                {[
                  { d: 'BLOCK',    risk: 'CRITICAL', user: 'emp_041', color: '#f43f5e' },
                  { d: 'SANITIZE', risk: 'MEDIUM',   user: 'emp_102', color: '#f59e0b' },
                  { d: 'ALLOW',    risk: 'LOW',      user: 'emp_007', color: '#00ff88' },
                ].map((row, i) => (
                  <motion.div
                    key={i}
                    initial={{ opacity: 0, x: 8 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: 1.4 + i * 0.15 }}
                    className="flex items-center gap-2 py-1"
                    style={{ borderBottom: i < 2 ? '1px solid var(--border)' : undefined }}
                  >
                    <span className="text-[9px] font-bold px-1.5 py-0.5 rounded" style={{ backgroundColor: `${row.color}18`, color: row.color }}>
                      {row.d}
                    </span>
                    <span className="text-[9px] font-mono flex-1" style={{ color: 'var(--muted)' }}>{row.user}</span>
                    <span className="text-[9px]" style={{ color: 'var(--faint)' }}>{row.risk}</span>
                  </motion.div>
                ))}
              </div>

              {/* CTA strip */}
              <a
                href="http://127.0.0.1:5173"
                className="flex items-center justify-center gap-2 py-2.5 text-[11px] font-bold transition-all"
                style={{
                  backgroundColor: isDark ? 'rgba(0,212,255,0.08)' : 'rgba(0,144,200,0.07)',
                  borderTop: '1px solid var(--border)',
                  color: 'var(--accent)',
                }}
                onMouseEnter={e => (e.currentTarget.style.backgroundColor = isDark ? 'rgba(0,212,255,0.14)' : 'rgba(0,144,200,0.12)')}
                onMouseLeave={e => (e.currentTarget.style.backgroundColor = isDark ? 'rgba(0,212,255,0.08)' : 'rgba(0,144,200,0.07)')}
              >
                Open full dashboard <ArrowRight className="w-3 h-3" />
              </a>
            </div>

            {/* Glow behind card */}
            <div
              className="absolute -inset-4 -z-10 rounded-3xl blur-2xl opacity-30 pointer-events-none"
              style={{ backgroundColor: 'var(--accent-bg)' }}
            />
          </motion.div>

        </div>
      </div>

      {/* Scroll nudge */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 1.5 }}
        className="absolute bottom-7 left-7 z-20 flex items-center gap-2"
        style={{ color: 'var(--faint)' }}
      >
        <div className="w-px h-10" style={{ background: 'linear-gradient(to bottom, transparent, var(--border))' }} />
        <span className="text-[10px] tracking-[0.22em] uppercase">Scroll</span>
      </motion.div>
    </section>
  );
}
