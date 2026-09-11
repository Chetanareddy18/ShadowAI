import { type ReactNode } from 'react';
import { NavLink, useNavigate } from 'react-router-dom';
import { useSession } from '../store/session';
import {
  LayoutDashboard, AlertTriangle, Users, Building2,
  ClipboardList, MessageSquare, LogOut, Shield,
} from 'lucide-react';
import { motion } from 'framer-motion';

const nav = [
  { label: 'Dashboard',      to: '/dashboard', icon: LayoutDashboard, adminOnly: true  },
  { label: 'Threat Feed',    to: '/threats',   icon: AlertTriangle,   adminOnly: true  },
  { label: 'Users',          to: '/users',     icon: Users,           adminOnly: true  },
  { label: 'Organisations',  to: '/orgs',      icon: Building2,       adminOnly: true  },
  { label: 'Audit Logs',     to: '/audit',     icon: ClipboardList,   adminOnly: true  },
  { label: 'Prompt Studio',  to: '/chat',      icon: MessageSquare,   adminOnly: false },
];

export default function AppLayout({ children }: { children: ReactNode }) {
  const { userId, role, isAdmin, clear } = useSession();
  const navigate = useNavigate();

  const handleLogout = () => { clear(); navigate('/'); };
  const visible = nav.filter(n => !n.adminOnly || isAdmin);

  return (
    <div className="flex h-screen overflow-hidden bg-cyber-950">
      {/* Sidebar */}
      <motion.aside
        initial={{ x: -20, opacity: 0 }}
        animate={{ x: 0, opacity: 1 }}
        transition={{ duration: 0.35 }}
        className="w-56 flex-shrink-0 flex flex-col border-r border-white/5 bg-cyber-900/60 backdrop-blur-xl"
      >
        {/* Brand */}
        <div className="px-5 py-5 border-b border-white/5">
          <div className="flex items-center gap-2">
            <Shield className="w-6 h-6 text-cyan-400" />
            <span className="font-bold text-white text-sm tracking-wide">Shadow AI</span>
          </div>
          <p className="text-xs text-white/30 mt-0.5 ml-8">Security Gateway</p>
        </div>

        {/* Nav */}
        <nav className="flex-1 p-3 space-y-0.5 overflow-y-auto">
          {visible.map(({ label, to, icon: Icon }) => (
            <NavLink
              key={to}
              to={to}
              className={({ isActive }) =>
                `flex items-center gap-2.5 px-3 py-2 rounded-lg text-sm font-medium transition-all duration-150
                ${isActive
                  ? 'bg-cyan-400/10 text-cyan-400 shadow-[inset_0_0_12px_rgba(17,212,214,0.08)]'
                  : 'text-white/50 hover:text-white/80 hover:bg-white/5'}`
              }
            >
              <Icon className="w-4 h-4 flex-shrink-0" />
              {label}
            </NavLink>
          ))}
        </nav>

        {/* User pill */}
        <div className="p-3 border-t border-white/5">
          <div className="flex items-center gap-2 px-3 py-2 rounded-lg bg-white/5">
            <div className="w-7 h-7 rounded-full bg-gradient-to-br from-cyan-400 to-violet-500 flex items-center justify-center text-xs font-bold text-black flex-shrink-0">
              {(userId?.[0] ?? 'U').toUpperCase()}
            </div>
            <div className="min-w-0 flex-1">
              <p className="text-xs font-medium text-white/80 truncate">{userId}</p>
              <p className="text-[10px] text-white/30 capitalize">{role}</p>
            </div>
            <button
              onClick={handleLogout}
              className="text-white/30 hover:text-rose-400 transition-colors"
              title="Sign out"
            >
              <LogOut className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      </motion.aside>

      {/* Main */}
      <div className="flex-1 flex flex-col overflow-hidden">
        {children}
      </div>
    </div>
  );
}
