import { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Plus, Trash2, X } from 'lucide-react';
import { api, type User } from '../lib/api';
import PageShell from '../components/PageShell';
import { RoleBadge } from '../components/Badges';

function Modal({ open, onClose, title, children }: { open: boolean; onClose: () => void; title: string; children: React.ReactNode }) {
  return (
    <AnimatePresence>
      {open && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            className="absolute inset-0 bg-black/70 backdrop-blur-sm" onClick={onClose} />
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: 12 }} animate={{ opacity: 1, scale: 1, y: 0 }} exit={{ opacity: 0, scale: 0.95 }}
            transition={{ duration: 0.2 }}
            className="relative z-10 w-full max-w-md bg-cyber-900 border border-white/10 rounded-2xl p-6 shadow-2xl"
          >
            <div className="flex items-center justify-between mb-5">
              <h2 className="text-base font-semibold text-white">{title}</h2>
              <button onClick={onClose} className="text-white/30 hover:text-white transition-colors"><X className="w-4 h-4" /></button>
            </div>
            {children}
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}

export default function Users() {
  const [users, setUsers]     = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [addOpen, setAddOpen] = useState(false);
  const [delTarget, setDelTarget] = useState<string | null>(null);
  const [form, setForm] = useState({ user_id: '', org_id: 'org_default', role: 'employee', api_key: '' });
  const [err, setErr]   = useState('');
  const [saving, setSaving] = useState(false);

  const load = async () => {
    setLoading(true);
    try { setUsers(await api.users()); } finally { setLoading(false); }
  };

  useEffect(() => { load(); }, []);

  const handleCreate = async () => {
    setErr('');
    if (!form.user_id || !form.api_key) { setErr('User ID and API Key are required.'); return; }
    setSaving(true);
    try {
      await api.createUser(form);
      setAddOpen(false);
      setForm({ user_id: '', org_id: 'org_default', role: 'employee', api_key: '' });
      load();
    } catch (e: unknown) {
      setErr(e instanceof Error ? e.message : 'Failed');
    } finally { setSaving(false); }
  };

  const handleDelete = async (id: string) => {
    await api.deleteUser(id).catch(() => {});
    setDelTarget(null);
    load();
  };

  return (
    <PageShell
      title="Users"
      subtitle="Manage gateway users and API keys"
      actions={
        <button onClick={() => { setErr(''); setAddOpen(true); }}
          className="flex items-center gap-1.5 px-3 py-1.5 bg-cyan-400 hover:bg-cyan-300 text-black text-xs font-bold rounded-lg transition-colors">
          <Plus className="w-3.5 h-3.5" /> Add User
        </button>
      }
    >
      {/* Table */}
      <div className="bg-cyber-900/60 border border-white/5 rounded-2xl overflow-hidden">
        {loading ? (
          <div className="flex items-center justify-center h-48">
            <span className="w-6 h-6 border-2 border-cyan-400/30 border-t-cyan-400 rounded-full animate-spin" />
          </div>
        ) : (
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-white/5 text-[11px] text-white/30 uppercase tracking-wider">
                <th className="text-left px-4 py-3 font-medium">User</th>
                <th className="text-left px-4 py-3 font-medium">Org</th>
                <th className="text-left px-4 py-3 font-medium">Role</th>
                <th className="text-left px-4 py-3 font-medium">Status</th>
                <th className="text-left px-4 py-3 font-medium">Created</th>
                <th className="px-4 py-3" />
              </tr>
            </thead>
            <tbody className="divide-y divide-white/3">
              {users.map(u => (
                <tr key={u.user_id} className="hover:bg-white/2 transition-colors">
                  <td className="px-4 py-3 font-mono text-xs text-white/80">{u.user_id}</td>
                  <td className="px-4 py-3">
                    <span className="text-xs bg-white/8 text-white/50 px-2 py-0.5 rounded">{u.org_id}</span>
                  </td>
                  <td className="px-4 py-3"><RoleBadge v={u.role} /></td>
                  <td className="px-4 py-3">
                    <span className={`text-[11px] px-2 py-0.5 rounded-full ${u.is_active !== 'false' ? 'bg-mint-400/10 text-mint-400' : 'bg-white/5 text-white/25'}`}>
                      {u.is_active !== 'false' ? 'Active' : 'Inactive'}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-xs text-white/30">{new Date(u.created_at).toLocaleDateString()}</td>
                  <td className="px-4 py-3 text-right">
                    <button onClick={() => setDelTarget(u.user_id)}
                      className="p-1.5 rounded-lg text-white/20 hover:text-rose-400 hover:bg-rose-500/10 transition-all">
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
        {!loading && !users.length && (
          <div className="text-center py-12 text-white/20 text-sm">No users yet</div>
        )}
      </div>

      {/* Add modal */}
      <Modal open={addOpen} onClose={() => setAddOpen(false)} title="Add User">
        <div className="space-y-3">
          {[
            { label: 'User ID', key: 'user_id', placeholder: 'emp_001' },
            { label: 'Org ID',  key: 'org_id',  placeholder: 'org_default' },
            { label: 'API Key', key: 'api_key',  placeholder: 'secret-key-123' },
          ].map(({ label, key, placeholder }) => (
            <div key={key}>
              <label className="block text-xs text-white/40 mb-1">{label}</label>
              <input value={(form as Record<string,string>)[key]} onChange={e => setForm(f => ({ ...f, [key]: e.target.value }))}
                placeholder={placeholder}
                className="w-full px-3 py-2 bg-white/5 border border-white/10 rounded-xl text-sm text-white placeholder:text-white/20 focus:outline-none focus:border-cyan-400/50 transition-all" />
            </div>
          ))}
          <div>
            <label className="block text-xs text-white/40 mb-1">Role</label>
            <select value={form.role} onChange={e => setForm(f => ({ ...f, role: e.target.value }))}
              className="w-full px-3 py-2 bg-white/5 border border-white/10 rounded-xl text-sm text-white focus:outline-none focus:border-cyan-400/50 transition-all">
              <option value="employee">Employee</option>
              <option value="admin">Admin</option>
            </select>
          </div>
          {err && <p className="text-xs text-rose-400 bg-rose-500/10 border border-rose-500/20 rounded-lg px-3 py-2">{err}</p>}
          <div className="flex gap-2 pt-1">
            <button onClick={() => setAddOpen(false)} className="flex-1 py-2 bg-white/5 hover:bg-white/10 text-white/60 text-sm rounded-xl transition-colors">Cancel</button>
            <button onClick={handleCreate} disabled={saving}
              className="flex-1 py-2 bg-cyan-400 hover:bg-cyan-300 text-black text-sm font-bold rounded-xl transition-colors disabled:opacity-50">
              {saving ? 'Creating…' : 'Create'}
            </button>
          </div>
        </div>
      </Modal>

      {/* Confirm delete */}
      <Modal open={!!delTarget} onClose={() => setDelTarget(null)} title="Deactivate User">
        <p className="text-sm text-white/60 mb-5">Deactivate <span className="font-mono text-white">{delTarget}</span>?</p>
        <div className="flex gap-2">
          <button onClick={() => setDelTarget(null)} className="flex-1 py-2 bg-white/5 hover:bg-white/10 text-white/60 text-sm rounded-xl transition-colors">Cancel</button>
          <button onClick={() => delTarget && handleDelete(delTarget)}
            className="flex-1 py-2 bg-rose-500 hover:bg-rose-400 text-white text-sm font-bold rounded-xl transition-colors">
            Deactivate
          </button>
        </div>
      </Modal>
    </PageShell>
  );
}
