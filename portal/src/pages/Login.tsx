import { useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Canvas, useFrame } from '@react-three/fiber';
import { Points, PointMaterial } from '@react-three/drei';
import * as THREE from 'three';
import { motion } from 'framer-motion';
import { Shield, Zap } from 'lucide-react';
import { useSession } from '../store/session';
import { api } from '../lib/api';

// ── Particle field ────────────────────────────────────────────
function ParticleField() {
  const ref = useRef<THREE.Points>(null!);
  const count = 2000;
  const positions = new Float32Array(count * 3);
  for (let i = 0; i < count * 3; i++) positions[i] = (Math.random() - 0.5) * 8;

  useFrame(({ clock }) => {
    if (ref.current) {
      ref.current.rotation.y = clock.getElapsedTime() * 0.04;
      ref.current.rotation.x = Math.sin(clock.getElapsedTime() * 0.02) * 0.2;
    }
  });

  return (
    <Points ref={ref} positions={positions} stride={3} frustumCulled={false}>
      <PointMaterial size={0.018} color="#11d4d6" sizeAttenuation transparent opacity={0.7} depthWrite={false} />
    </Points>
  );
}

// ── Login page ────────────────────────────────────────────────
export default function Login() {
  const navigate = useNavigate();
  const { save, hydrate } = useSession();

  const [apiKey, setApiKey]       = useState('');
  const [gatewayUrl, setGatewayUrl] = useState('http://localhost:8000');
  const [loading, setLoading]     = useState(false);
  const [error, setError]         = useState('');

  useEffect(() => {
    if (hydrate()) navigate('/dashboard');
  }, []);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      // Save URL to sessionStorage first so api.ts picks it up
      sessionStorage.setItem('shadow_api_key', apiKey);
      sessionStorage.setItem('shadow_gateway_url', gatewayUrl);

      await api.health();

      let role = 'employee';
      let userId = 'user';
      try {
        const stats = await api.stats();
        if (stats) role = 'admin';
        // Try to extract userId from anomalies or users endpoint
        const users = await api.users();
        const me = users[0]; // pick first entry as a proxy for current user
        userId = me?.user_id ?? 'admin';
      } catch {
        role = 'employee';
        userId = 'employee';
      }

      save({ apiKey, role, userId, gatewayUrl, isAdmin: role === 'admin' });
      navigate(role === 'admin' ? '/dashboard' : '/chat');
    } catch (err: unknown) {
      sessionStorage.clear();
      setError(err instanceof Error ? err.message : 'Connection failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="relative w-full h-full overflow-hidden bg-cyber-950 flex items-center justify-center">
      {/* Three.js background */}
      <div className="absolute inset-0">
        <Canvas camera={{ position: [0, 0, 3], fov: 60 }} gl={{ antialias: false }}>
          <ParticleField />
        </Canvas>
      </div>

      {/* Glow orbs */}
      <div className="absolute top-1/4 -left-32 w-96 h-96 bg-cyan-400/5 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute bottom-1/4 -right-32 w-96 h-96 bg-violet-500/5 rounded-full blur-3xl pointer-events-none" />

      {/* Card */}
      <motion.div
        initial={{ opacity: 0, y: 24, scale: 0.97 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        transition={{ duration: 0.45, ease: [0.22, 1, 0.36, 1] }}
        className="relative z-10 w-full max-w-sm mx-4"
      >
        <div className="bg-cyber-900/80 backdrop-blur-2xl border border-white/10 rounded-2xl p-8 shadow-2xl shadow-black/60">
          {/* Logo */}
          <div className="flex flex-col items-center mb-8">
            <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-cyan-400 to-violet-500 flex items-center justify-center mb-3 shadow-lg shadow-cyan-400/20">
              <Shield className="w-7 h-7 text-black" />
            </div>
            <h1 className="text-xl font-bold text-white">Shadow AI</h1>
            <p className="text-xs text-white/40 mt-1">Security Gateway Portal</p>
          </div>

          <form onSubmit={handleLogin} className="space-y-4">
            <div>
              <label className="block text-xs font-medium text-white/50 mb-1.5">Gateway URL</label>
              <input
                type="url"
                value={gatewayUrl}
                onChange={e => setGatewayUrl(e.target.value)}
                className="w-full px-3.5 py-2.5 bg-white/5 border border-white/10 rounded-xl text-sm text-white placeholder:text-white/20 focus:outline-none focus:border-cyan-400/50 focus:bg-white/8 transition-all"
                placeholder="http://localhost:8000"
                required
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-white/50 mb-1.5">API Key</label>
              <input
                type="password"
                value={apiKey}
                onChange={e => setApiKey(e.target.value)}
                className="w-full px-3.5 py-2.5 bg-white/5 border border-white/10 rounded-xl text-sm text-white placeholder:text-white/20 focus:outline-none focus:border-cyan-400/50 focus:bg-white/8 transition-all"
                placeholder="shadow_admin"
                required
              />
            </div>

            {error && (
              <motion.p
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: 'auto' }}
                className="text-xs text-rose-400 bg-rose-500/10 border border-rose-500/20 rounded-lg px-3 py-2"
              >
                {error}
              </motion.p>
            )}

            <button
              type="submit"
              disabled={loading}
              className="w-full py-2.5 bg-gradient-to-r from-cyan-400 to-cyan-500 hover:from-cyan-300 hover:to-cyan-400 text-black text-sm font-bold rounded-xl transition-all shadow-lg shadow-cyan-400/25 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
            >
              {loading ? (
                <span className="w-4 h-4 border-2 border-black/30 border-t-black rounded-full animate-spin" />
              ) : (
                <><Zap className="w-4 h-4" /> Sign In</>
              )}
            </button>
          </form>

          <p className="text-center text-[11px] text-white/20 mt-6">
            Seed keys: <span className="text-white/40 font-mono">shadow_admin</span> · <span className="text-white/40 font-mono">shadow_emp_101</span>
          </p>
        </div>
      </motion.div>
    </div>
  );
}
