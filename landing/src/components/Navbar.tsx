import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Shield, Sun, Moon } from 'lucide-react';
import { useTheme } from '../contexts/ThemeContext';

export default function Navbar() {
  const [scrolled, setScrolled] = useState(false);
  const { theme, toggle } = useTheme();
  const isDark = theme === 'dark';

  useEffect(() => {
    const fn = () => setScrolled(window.scrollY > 40);
    window.addEventListener('scroll', fn, { passive: true });
    return () => window.removeEventListener('scroll', fn);
  }, []);

  return (
    <motion.nav
      initial={{ y: -20, opacity: 0 }}
      animate={{ y: 0, opacity: 1 }}
      transition={{ duration: 0.5 }}
      className={[
        'fixed top-0 inset-x-0 z-50 px-6 py-4 flex items-center justify-between transition-all duration-300',
        scrolled ? 'backdrop-blur-xl border-b shadow-lg' : '',
      ].join(' ')}
      style={scrolled ? { backgroundColor: 'var(--nav-bg)', borderColor: 'var(--border)' } : {}}
    >
      {/* Logo */}
      <a href="/" className="flex items-center gap-2.5 group">
        <div
          className="w-8 h-8 rounded-lg flex items-center justify-center group-hover:scale-110 transition-transform"
          style={{ backgroundColor: 'var(--accent-bg)', border: '1px solid var(--accent-border)' }}
        >
          <Shield className="w-4 h-4" style={{ color: 'var(--accent)' }} />
        </div>
        <span
          className="font-black text-lg tracking-tight t-text"
          style={{ fontFamily: "'Unbounded', sans-serif" }}
        >
          SHADOW<span style={{ color: 'var(--accent)' }}>AI</span>
        </span>
      </a>

      {/* Nav links */}
      <div className="hidden md:flex items-center gap-7 text-sm font-medium t-muted">
        {['Features', 'Pipeline'].map(l => (
          <a
            key={l}
            href={`#${l.toLowerCase()}`}
            className="hover:t-text transition-colors"
            style={{ color: 'var(--muted)' }}
            onMouseEnter={e => (e.currentTarget.style.color = 'var(--text)')}
            onMouseLeave={e => (e.currentTarget.style.color = 'var(--muted)')}
          >{l}</a>
        ))}
      </div>

      <div className="flex items-center gap-2">
        {/* Theme toggle */}
        <motion.button
          onClick={toggle}
          whileTap={{ scale: 0.88 }}
          className="w-9 h-9 rounded-xl flex items-center justify-center transition-colors"
          style={{ backgroundColor: 'var(--surface)', border: '1px solid var(--border)' }}
          title={isDark ? 'Switch to light' : 'Switch to dark'}
        >
          <motion.div
            key={theme}
            initial={{ rotate: -30, opacity: 0 }}
            animate={{ rotate: 0, opacity: 1 }}
            transition={{ duration: 0.25 }}
          >
            {isDark
              ? <Sun  className="w-4 h-4 text-amber-400" />
              : <Moon className="w-4 h-4 text-indigo-400" />}
          </motion.div>
        </motion.button>

        {/* Portal CTA */}
        <a
          href="http://127.0.0.1:5173"
          className="flex items-center gap-2 px-4 py-2 text-black font-bold text-xs rounded-xl transition-all hover:-translate-y-0.5"
          style={{
            backgroundColor: 'var(--accent)',
            boxShadow: `0 0 20px var(--accent-bg)`,
          }}
          onMouseEnter={e => (e.currentTarget.style.filter = 'brightness(1.15)')}
          onMouseLeave={e => (e.currentTarget.style.filter = '')}
        >
          <Shield className="w-3.5 h-3.5" /> Launch Portal
        </a>
      </div>
    </motion.nav>
  );
}
