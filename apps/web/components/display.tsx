import type { ReactNode } from "react";
import { AlertTriangle, CheckCircle2, Info, XCircle } from "lucide-react";
import { Progress } from "@classconnect/ui";

export function PageHeader({
  title: _title,
  description: _description,
  actions,
}: {
  title: ReactNode;
  description: ReactNode;
  actions?: ReactNode;
}) {
  if (!actions) return null;
  return <div className="page-header page-header--actions"><div className="page-header__actions">{actions}</div></div>;
}

export function SectionTitle({
  title,
  description,
  action,
}: {
  title: ReactNode;
  description?: ReactNode;
  action?: ReactNode;
}) {
  return (
    <div className="section-title">
      <div><h3>{title}</h3>{description ? <p>{description}</p> : null}</div>
      {action}
    </div>
  );
}

export function MetricRow({
  label,
  value,
  percent,
  tone = "brand",
}: {
  label: string;
  value: string;
  percent: number;
  tone?: "brand" | "success" | "warning" | "danger" | "info" | "neutral";
}) {
  return <div className="metric-row"><label>{label}</label><Progress value={percent} tone={tone} /><strong>{value}</strong></div>;
}

export function AlertCard({
  title,
  description,
  tone = "warning",
  action,
}: {
  title: ReactNode;
  description: ReactNode;
  tone?: "warning" | "danger" | "success" | "info";
  action?: ReactNode;
}) {
  const Icon = tone === "warning" ? AlertTriangle : tone === "danger" ? XCircle : tone === "success" ? CheckCircle2 : Info;
  return (
    <div className={`alert-card alert-card--${tone}`}>
      <span className="alert-card__icon"><Icon size={18} /></span>
      <div><h3>{title}</h3><p>{description}</p></div>
      {action}
    </div>
  );
}

export function MiniAreaChart({ labels = ["W1", "W4", "W8", "W12", "Now"] }: { labels?: string[] }) {
  return (
    <div className="mini-chart">
      <svg viewBox="0 0 700 230" preserveAspectRatio="none" aria-label="Performance trend chart">
        <defs><linearGradient id="chartArea" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stopColor="#0047ad" stopOpacity=".25" /><stop offset="100%" stopColor="#0047ad" stopOpacity="0" /></linearGradient></defs>
        <g className="chart-grid"><line x1="45" y1="30" x2="680" y2="30" /><line x1="45" y1="80" x2="680" y2="80" /><line x1="45" y1="130" x2="680" y2="130" /><line x1="45" y1="180" x2="680" y2="180" /></g>
        <path className="chart-area" d="M45 176 C120 165 160 154 220 150 S320 124 390 126 S495 96 560 89 S630 72 680 64 L680 205 L45 205Z" />
        <path className="chart-line" d="M45 176 C120 165 160 154 220 150 S320 124 390 126 S495 96 560 89 S630 72 680 64" />
        {[ [45,176], [220,150], [390,126], [560,89], [680,64] ].map(([x,y]) => <circle key={`${x}-${y}`} className="chart-dot" cx={x} cy={y} r={x === 680 ? 6 : 5} />)}
        <text className="chart-label" x="9" y="35">4.0</text><text className="chart-label" x="9" y="85">3.5</text><text className="chart-label" x="9" y="135">3.0</text><text className="chart-label" x="9" y="185">2.5</text>
        {[45,220,390,560,665].map((x,index) => <text key={labels[index]} className="chart-label" x={x} y="222">{labels[index]}</text>)}
      </svg>
    </div>
  );
}

export function RiskGauge({ score, label = "out of 100", tone = "warning" }: { score: number; label?: string; tone?: "warning" | "danger" | "success" }) {
  const colour = tone === "danger" ? "var(--danger)" : tone === "success" ? "var(--success)" : "var(--warning)";
  return (
    <div className="risk-gauge" style={{ background: `conic-gradient(${colour} 0 ${score}%, var(--surface-strong) ${score}% 100%)` }}>
      <div className="risk-gauge__copy"><strong>{score}</strong><span>{label}</span></div>
    </div>
  );
}
