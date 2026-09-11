const DECISION_STYLES: Record<string, string> = {
  BLOCK:    'bg-rose-500/15 text-rose-400 border border-rose-500/30',
  SANITIZE: 'bg-amber-400/15 text-amber-400 border border-amber-400/30',
  ALLOW:    'bg-mint-400/15 text-mint-400 border border-mint-400/30',
};

const RISK_STYLES: Record<string, string> = {
  CRITICAL: 'bg-rose-500/15 text-rose-400 border border-rose-500/30',
  HIGH:     'bg-amber-400/15 text-amber-400 border border-amber-400/30',
  MEDIUM:   'bg-violet-500/15 text-violet-400 border border-violet-500/30',
  LOW:      'bg-cyan-400/15 text-cyan-400 border border-cyan-400/30',
};

const ROLE_STYLES: Record<string, string> = {
  admin:    'bg-violet-500/15 text-violet-400 border border-violet-500/30',
  employee: 'bg-cyan-400/15 text-cyan-400 border border-cyan-400/30',
};

function badge(label: string, styles: Record<string, string>, fallback = 'bg-white/10 text-white/40') {
  const cls = styles[label?.toUpperCase?.()] ?? styles[label] ?? fallback;
  return (
    <span className={`inline-flex items-center px-2 py-0.5 rounded-md text-[11px] font-semibold tracking-wide ${cls}`}>
      {label}
    </span>
  );
}

export const DecisionBadge = ({ v }: { v: string }) => badge(v, DECISION_STYLES);
export const RiskBadge     = ({ v }: { v: string }) => badge(v, RISK_STYLES);
export const RoleBadge     = ({ v }: { v: string }) => badge(v, ROLE_STYLES);
