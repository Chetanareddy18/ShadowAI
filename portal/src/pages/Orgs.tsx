import { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Plus, Save, RotateCcw, X } from 'lucide-react';
import { api, type Org } from '../lib/api';
import PageShell from '../components/PageShell';

const DEFAULT_POLICY = {
  block_on: ['CRITICAL'],
  sanitize_on: ['HIGH', 'MEDIUM'],
  allowed_models: ['gpt-4o-mini', 'gpt-4o'],
  blocked_categories: [],
  max_prompt_length: 10000,
  custom_blocked_keywords: [],
  allow_code: true,
};

function Modal({ open, onClose, children }: { open: boolean; onClose: () => void; children: React.ReactNode }) {
  return (
    <AnimatePresence>
      {open && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            className="absolute inset-0 bg-black/70 backdrop-blur-sm" onClick={onClose} />
          <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.95 }}
            transition={{ duration: 0.2 }}
            className="relative z-10 w-full max-w-md bg-cyber-900 border border-white/10 rounded-2xl p-6 shadow-2xl">
            {children}
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}

export default function Orgs() {
  const [orgs, setOrgs]           = useState<Org[]>([]);
  const [loading, setLoading]     = useState(true);
  const [selectedOrg, setSelectedOrg] = useState<string | null>(null);
  const [policyJson, setPolicyJson]   = useState('');
  const [policyErr, setPolicyErr]     = useState('');
  const [saving, setSaving]           = useState(false);
  const [addOpen, setAddOpen]         = useState(false);
  const [form, setForm]               = useState({ org_id: '', name: '' });
  const [formErr, setFormErr]         = useState('');
  const [creating, setCreating]       = useState(false);

  const load = async () => {
    setLoading(true);
    try { setOrgs(await api.orgs()); } finally { setLoading(false); }
  };

  useEffect(() => { load(); }, []);

  const selectOrg = async (orgId: string) => {
    setSelectedOrg(orgId);
    setPolicyJson(JSON.stringify(DEFAULT_POLICY, null, 2));
    setPolicyErr('');
    try {
      const p = await api.getPolicy(orgId);
      setPolicyJson(JSON.stringify(p, null, 2));
    } catch { /* use default */ }
  };

  const savePolicy = async () => {
    if (!selectedOrg) return;
    let parsed: unknown;
    try { parsed = JSON.parse(policyJson); } catch { setPolicyErr('Invalid JSON'); return; }
    setSaving(true);
    try {
      await api.updatePolicy({ org_id: selectedOrg, policy: parsed });
      load();
    } catch (e: unknown) {
      setPolicyErr(e instanceof Error ? e.message : 'Save failed');
    } finally { setSaving(false); }
  };

  const createOrg = async () => {
    setFormErr('');
    if (!form.org_id || !form.name) { setFormErr('Both fields required.'); return; }
    setCreating(true);
    try {
      await api.createOrg(form);
      setAddOpen(false);
      setForm({ org_id: '', name: '' });
      load();
    } catch (e: unknown) {
      setFormErr(e instanceof Error ? e.message : 'Failed');
    } finally { setCreating(false); }
  };

  return (
    <PageShell
      title="Organisations"
      subtitle="Manage tenants and their security policies"
      actions={
        <button onClick={() => { setFormErr(''); setAddOpen(true); }}
          className="flex items-center gap-1.5 px-3 py-1.5 bg-cyan-400 hover:bg-cyan-300 text-black text-xs font-bold rounded-lg transition-colors">
          <Plus className="w-3.5 h-3.5" /> Add Org
        </button>
      }
    >
      <div className="grid grid-cols-1 lg:grid-cols-5 gap-4">
        {/* Org list */}
        <div className="lg:col-span-2 space-y-2">
          {loading ? (
            <div className="flex items-center justify-center h-32">
              <span className="w-6 h-6 border-2 border-cyan-400/30 border-t-cyan-400 rounded-full animate-spin" />
            </div>
          ) : orgs.map(o => (
            <button
              key={o.org_id}
              onClick={() => selectOrg(o.org_id)}
              className={`w-full text-left p-4 rounded-2xl border transition-all ${selectedOrg === o.org_id
                ? 'bg-cyan-400/8 border-cyan-400/30 shadow-[0_0_20px_rgba(17,212,214,0.06)]'
                : 'bg-cyber-900/60 border-white/5 hover:border-white/10 hover:bg-white/3'}`}
            >
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-white">{o.name}</p>
                  <p className="text-xs font-mono text-white/35 mt-0.5">{o.org_id}</p>
                </div>
                <span className={`text-[10px] px-2 py-0.5 rounded-full border ${o.has_custom_policy
                  ? 'bg-violet-500/10 text-violet-400 border-violet-500/30'
                  : 'bg-white/5 text-white/25 border-white/10'}`}>
                  {o.has_custom_policy ? 'Custom' : 'Default'}
                </span>
              </div>
            </button>
          ))}
          {!loading && !orgs.length && (
            <div className="text-center py-8 text-white/20 text-sm">No organisations</div>
          )}
        </div>

        {/* Policy editor */}
        <div className="lg:col-span-3 bg-cyber-900/60 border border-white/5 rounded-2xl p-5">
          {!selectedOrg ? (
            <div className="flex flex-col items-center justify-center h-full py-16 text-white/20">
              <p className="text-sm">← Select an organisation to edit its policy</p>
            </div>
          ) : (
            <>
              <div className="flex items-center justify-between mb-4">
                <div>
                  <h3 className="text-sm font-semibold text-white">Policy Editor</h3>
                  <p className="text-xs text-white/35 mt-0.5 font-mono">{selectedOrg}</p>
                </div>
                <div className="flex gap-2">
                  <button onClick={() => setPolicyJson(JSON.stringify(DEFAULT_POLICY, null, 2))}
                    className="p-1.5 rounded-lg text-white/30 hover:text-white hover:bg-white/5 transition-all" title="Reset">
                    <RotateCcw className="w-4 h-4" />
                  </button>
                  <button onClick={savePolicy} disabled={saving}
                    className="flex items-center gap-1.5 px-3 py-1.5 bg-cyan-400 hover:bg-cyan-300 text-black text-xs font-bold rounded-lg transition-colors disabled:opacity-50">
                    {saving ? <span className="w-3.5 h-3.5 border-2 border-black/30 border-t-black rounded-full animate-spin" /> : <Save className="w-3.5 h-3.5" />}
                    Save
                  </button>
                </div>
              </div>
              <textarea
                value={policyJson}
                onChange={e => { setPolicyJson(e.target.value); setPolicyErr(''); }}
                spellCheck={false}
                rows={16}
                className="w-full px-4 py-3 bg-black/40 border border-white/8 rounded-xl text-xs font-mono text-green-400 focus:outline-none focus:border-cyan-400/40 resize-none leading-relaxed transition-all"
              />
              {policyErr && <p className="text-xs text-rose-400 mt-2">{policyErr}</p>}
            </>
          )}
        </div>
      </div>

      {/* Add org modal */}
      <Modal open={addOpen} onClose={() => setAddOpen(false)}>
        <div className="flex items-center justify-between mb-5">
          <h2 className="text-base font-semibold text-white">Add Organisation</h2>
          <button onClick={() => setAddOpen(false)} className="text-white/30 hover:text-white transition-colors"><X className="w-4 h-4" /></button>
        </div>
        <div className="space-y-3">
          {[{ label: 'Org ID', key: 'org_id', ph: 'org_acme' }, { label: 'Display Name', key: 'name', ph: 'Acme Corp' }].map(({ label, key, ph }) => (
            <div key={key}>
              <label className="block text-xs text-white/40 mb-1">{label}</label>
              <input value={(form as Record<string,string>)[key]} onChange={e => setForm(f => ({ ...f, [key]: e.target.value }))}
                placeholder={ph}
                className="w-full px-3 py-2 bg-white/5 border border-white/10 rounded-xl text-sm text-white placeholder:text-white/20 focus:outline-none focus:border-cyan-400/50 transition-all" />
            </div>
          ))}
          {formErr && <p className="text-xs text-rose-400 bg-rose-500/10 border border-rose-500/20 rounded-lg px-3 py-2">{formErr}</p>}
          <div className="flex gap-2 pt-1">
            <button onClick={() => setAddOpen(false)} className="flex-1 py-2 bg-white/5 hover:bg-white/10 text-white/60 text-sm rounded-xl transition-colors">Cancel</button>
            <button onClick={createOrg} disabled={creating}
              className="flex-1 py-2 bg-cyan-400 hover:bg-cyan-300 text-black text-sm font-bold rounded-xl transition-colors disabled:opacity-50">
              {creating ? 'Creating…' : 'Create'}
            </button>
          </div>
        </div>
      </Modal>
    </PageShell>
  );
}
