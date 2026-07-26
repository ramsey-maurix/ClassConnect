"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { AlertTriangle, BookCopy, CheckCircle2, FileDown, GraduationCap, ScrollText, UsersRound, X } from "lucide-react";
import { Badge, Button, Card, CardHeader, StatCard } from "@classconnect/ui";
import { ApiError, apiRequest } from "@/lib/api/client";
import { PageHeader } from "./display";
import { useToast } from "./toast-provider";

type AdminAnalytics = {
  totalStudents: number;
  totalLecturers: number;
  totalCourses: number;
  atRiskStudents: number;
  attendanceRate: number;
  averageGrade: number;
  attendanceDistribution: Distribution[];
  riskDistribution: Distribution[];
  gradeDistribution: Distribution[];
};

type RecentAudit = {
  id: string;
  createdAt: string;
  action: string;
  entityType: string;
  description: string;
  actor: { firstName: string; lastName: string } | null;
};

export function LiveAdminDashboard() {
  const { toast } = useToast();
  const [data, setData] = useState<AdminAnalytics | null>(null);
  const [activity, setActivity] = useState<RecentAudit[]>([]);

  useEffect(() => {
    Promise.all([
      apiRequest<AdminAnalytics>("/analytics/admin"),
      apiRequest<RecentAudit[]>("/audit?take=6"),
    ]).then(([analytics, audit]) => {
      setData(analytics);
      setActivity(audit);
    }).catch((error) => toast("Dashboard could not be loaded", error instanceof ApiError ? error.message : "Please retry.", "danger"));
  }, []);

  if (!data) return <Card>Loading live system data…</Card>;

  return (
    <>
      <div className="page-header page-header--actions">
        <div className="page-header__actions">
          <Link className="ui-button ui-button--secondary ui-button--md" href="/admin/reports">Generate report</Link>
          <Link className="ui-button ui-button--primary ui-button--md" href="/admin/analytics">View analytics</Link>
        </div>
      </div>
      <div className="grid grid--4" style={{ marginBottom: 17 }}>
        <StatCard label="Students" value={data.totalStudents} icon={<UsersRound size={20} />} trend="Live accounts" />
        <StatCard label="Lecturers" value={data.totalLecturers} icon={<GraduationCap size={20} />} trend="Live accounts" />
        <StatCard label="Attendance rate" value={`${data.attendanceRate.toFixed(1)}%`} icon={<CheckCircle2 size={20} />} trend={data.attendanceRate ? "From verified records" : "No records yet"} />
        <StatCard label="Open risk alerts" value={data.atRiskStudents} icon={<AlertTriangle size={20} />} trend={data.atRiskStudents ? "Needs review" : "Clear"} trendTone={data.atRiskStudents ? "danger" : "success"} />
      </div>
      <div className="grid grid--main">
        <Card>
          <CardHeader title="Live academic summary" description="Calculated directly from PostgreSQL" />
          <div className="activity-list">
            <div className="activity"><span className="activity__icon"><BookCopy size={17} /></span><div><strong>{data.totalCourses} courses</strong><p>Created course definitions</p></div></div>
            <div className="activity"><span className="activity__icon"><GraduationCap size={17} /></span><div><strong>{data.averageGrade.toFixed(1)}% average grade</strong><p>Published and corrected grades only</p></div></div>
            <div className="activity"><span className="activity__icon"><CheckCircle2 size={17} /></span><div><strong>{data.attendanceRate.toFixed(1)}% attendance</strong><p>Present and late records</p></div></div>
          </div>
        </Card>
        <Card>
          <CardHeader title="Recent system activity" description="Latest recorded actions" />
          <div className="activity-list">
            {activity.length ? activity.map((item) => (
              <div className="activity" key={item.id}>
                <span className="activity__icon"><ScrollText size={16} /></span>
                <div><strong>{item.action.replaceAll("_", " ")}</strong><p>{item.description} · {item.actor ? `${item.actor.firstName} ${item.actor.lastName}` : "System"}</p></div>
                <time>{new Date(item.createdAt).toLocaleDateString()}</time>
              </div>
            )) : <p className="selection-empty">No system activity has been recorded yet.</p>}
          </div>
        </Card>
      </div>
    </>
  );
}

export function LiveAdminAnalytics() {
  const { toast } = useToast();
  const [data, setData] = useState<AdminAnalytics | null>(null);
  useEffect(() => { apiRequest<typeof data>("/analytics/admin").then(setData).catch((error) => toast("Analytics could not be loaded", error instanceof ApiError ? error.message : "Please retry.", "danger")); }, []);
  if (!data) return <Card>Calculating live analytics…</Card>;
  return <><PageHeader title="Cohort Analytics" description="Live indicators calculated from attendance, grades, courses, and risk records." /><div className="grid grid--3"><StatCard label="Students" value={data.totalStudents} icon={<UsersRound size={20} />} /><StatCard label="Lecturers" value={data.totalLecturers} icon={<GraduationCap size={20} />} /><StatCard label="Courses" value={data.totalCourses} icon={<BookCopy size={20} />} /><StatCard label="Attendance rate" value={`${data.attendanceRate.toFixed(1)}%`} icon={<CheckCircle2 size={20} />} trend={data.attendanceRate >= 75 ? "On target" : "Below target"} trendTone={data.attendanceRate >= 75 ? "success" : "warning"} /><StatCard label="Average grade" value={`${data.averageGrade.toFixed(1)}%`} icon={<GraduationCap size={20} />} /><StatCard label="Open risk alerts" value={data.atRiskStudents} icon={<AlertTriangle size={20} />} trend={data.atRiskStudents ? "Needs review" : "Clear"} trendTone={data.atRiskStudents ? "danger" : "success"} /></div><div className="grid grid--main" style={{ marginTop: 17 }}><div className="stack"><Card><CardHeader title="Grade distribution" description="Published and corrected grades by percentage band" /><LiveBarChart items={data.gradeDistribution} /></Card><Card><CardHeader title="Attendance distribution" description="Current attendance records by status" /><LiveBarChart items={data.attendanceDistribution} /></Card></div><Card><CardHeader title="Risk composition" description="Open student alerts by risk level" /><LiveDonut items={data.riskDistribution} /><LiveBarChart items={data.riskDistribution} compact /></Card></div></>;
}

type Distribution = { label: string; value: number };
function LiveBarChart({ items, compact = false }: { items: Distribution[]; compact?: boolean }) {
  const maximum = Math.max(1, ...items.map((item) => item.value));
  return <div className={`live-bars${compact ? " live-bars--compact" : ""}`}>{items.length ? items.map((item) => <div className="live-bar" key={item.label}><div className="live-bar__track"><span style={{ height: `${Math.max(item.value ? 8 : 0, item.value / maximum * 100)}%` }} /></div><strong>{item.value}</strong><small>{item.label.replaceAll("_", " ")}</small></div>) : <p className="selection-empty">No records available yet.</p>}</div>;
}
function LiveDonut({ items }: { items: Distribution[] }) {
  const total = items.reduce((sum, item) => sum + item.value, 0);
  const colors = ["var(--success)", "var(--warning)", "var(--danger)", "var(--info)"];
  let cursor = 0;
  const segments = items.map((item, index) => { const start = cursor; cursor += total ? item.value / total * 360 : 0; return `${colors[index % colors.length]} ${start}deg ${cursor}deg`; });
  return <div className="live-donut" style={{ background: total ? `conic-gradient(${segments.join(",")})` : "var(--surface-strong)" }}><div><strong>{total}</strong><span>open alerts</span></div></div>;
}

type ReportResult = { type: string; generatedAt: string; columns: string[]; rows: Array<Array<string | number | null>> };
const reportTypes = [
  ["attendance", "Attendance Report"],
  ["grades", "Grade Report"],
  ["risk", "At-Risk Student Report"],
  ["course-performance", "Course Performance Report"],
] as const;

function downloadReport(report: ReportResult) {
  const escape = (value: unknown) => `"${String(value ?? "").replaceAll('"', '""')}"`;
  const csv = [report.columns, ...report.rows].map((row) => row.map(escape).join(",")).join("\r\n");
  const url = URL.createObjectURL(new Blob([csv], { type: "text/csv;charset=utf-8" }));
  const anchor = document.createElement("a"); anchor.href = url; anchor.download = `${report.type}-${new Date().toISOString().slice(0, 10)}.csv`; anchor.click(); URL.revokeObjectURL(url);
}

export function LiveAdminReports() {
  const { toast } = useToast();
  const [type, setType] = useState("attendance");
  const [loading, setLoading] = useState(false);
  const [preview, setPreview] = useState<ReportResult | null>(null);
  async function generate(download: boolean) {
    setLoading(true);
    try {
      const result = await apiRequest<ReportResult>(`/reports/${type}`, { method: "POST" });
      setPreview(result);
      if (download) downloadReport(result);
      toast("Live report generated", `${result.rows.length} database row(s) included and the action was audited.`, "success");
    } catch (error) { toast("Report failed", error instanceof ApiError ? error.message : "Please retry.", "danger"); } finally { setLoading(false); }
  }
  return <><PageHeader title="Reports Centre" description="Generate audited CSV reports from current PostgreSQL records." /><Card><CardHeader title="Report type" description="Choose the live dataset to generate" /><div className="report-options">{reportTypes.map(([value, label]) => <label className="report-option" data-checked={type === value} key={value}><input type="radio" checked={type === value} onChange={() => setType(value)} /><strong>{label}</strong><span>Generated from the current system records.</span></label>)}</div><div className="form-actions"><Button variant="secondary" disabled={loading} onClick={() => void generate(false)}>Preview</Button><Button disabled={loading} onClick={() => void generate(true)}><FileDown size={16} /> {loading ? "Generating…" : "Generate CSV"}</Button></div></Card>{preview ? <Card className="table-shell" style={{ marginTop: 17 }}><div style={{ padding: 18 }}><CardHeader title="Report preview" description={`${preview.rows.length} rows · generated ${new Date(preview.generatedAt).toLocaleString()}`} action={<button className="icon-button" aria-label="Close report preview" title="Close preview" onClick={() => setPreview(null)}><X size={17} /></button>} /></div><div className="table-wrap"><table><thead><tr>{preview.columns.map((column) => <th key={column}>{column}</th>)}</tr></thead><tbody>{preview.rows.slice(0, 20).map((row, index) => <tr key={index}>{row.map((value, cell) => <td key={cell}>{value}</td>)}</tr>)}</tbody></table></div></Card> : null}</>;
}

type AuditItem = { id: string; createdAt: string; action: string; entityType: string; entityId: string | null; description: string; reason: string | null; ipAddress: string | null; actor: { firstName: string; lastName: string; email: string } | null };
export function LiveAdminAudit() {
  const { toast } = useToast();
  const [items, setItems] = useState<AuditItem[]>([]);
  useEffect(() => { apiRequest<AuditItem[]>("/audit?take=200").then(setItems).catch((error) => toast("Audit log could not be loaded", error instanceof ApiError ? error.message : "Please retry.", "danger")); }, []);
  return <><PageHeader title="Audit Log" description="Live immutable record of sensitive system actions." /><Card className="table-shell"><div className="table-wrap"><table><thead><tr><th>Date</th><th>Actor</th><th>Action</th><th>Record</th><th>Description</th><th>IP address</th></tr></thead><tbody>{items.map((item) => <tr key={item.id}><td>{new Date(item.createdAt).toLocaleString()}</td><td>{item.actor ? `${item.actor.firstName} ${item.actor.lastName}` : "System"}</td><td><Badge tone="info">{item.action.replaceAll("_", " ")}</Badge></td><td>{item.entityType}{item.entityId ? ` · ${item.entityId.slice(0, 8)}` : ""}</td><td>{item.description}{item.reason ? <><br /><span style={{ color: "var(--muted)" }}>Reason: {item.reason}</span></> : null}</td><td>{item.ipAddress ?? "—"}</td></tr>)}</tbody></table></div></Card></>;
}

type Setting = { id: string; key: string; value: string | number | boolean; description: string | null };
export function LiveAdminSettings() {
  const { toast } = useToast();
  const [settings, setSettings] = useState<Setting[]>([]);
  const [saving, setSaving] = useState(false);
  async function load() { try { const records = await apiRequest<Setting[]>("/settings"); const defaults: Setting[] = [{ id: "behavior-gps", key: "requireGpsGeofencing", value: true, description: "Students must be inside the configured classroom radius." }, { id: "behavior-location", key: "flagSuspiciousLocation", value: true, description: "Flag low-accuracy or suspicious attendance coordinates." }, { id: "behavior-notifications", key: "enableAcademicAlerts", value: true, description: "Send attendance, grade, standing, and risk notifications." }, { id: "behavior-audit", key: "enforceGradeEditReasons", value: true, description: "Require and audit reasons for published-grade corrections." }]; setSettings([...records, ...defaults.filter((item) => !records.some((record) => record.key === item.key))]); } catch (error) { toast("Settings could not be loaded", error instanceof ApiError ? error.message : "Please retry.", "danger"); } }
  useEffect(() => { void load(); }, []);
  async function save() {
    setSaving(true);
    try { await apiRequest("/settings", { method: "PATCH", body: JSON.stringify({ settings: Object.fromEntries(settings.map((item) => [item.key, item.value])) }) }); toast("Settings saved", "Thresholds now apply to the live system.", "success"); await load(); } catch (error) { toast("Settings could not be saved", error instanceof ApiError ? error.message : "Please retry.", "danger"); } finally { setSaving(false); }
  }
  const behavior = settings.filter((item) => typeof item.value === "boolean");
  const thresholds = settings.filter((item) => typeof item.value !== "boolean");
  const row = (item: Setting) => { const index = settings.findIndex((setting) => setting.key === item.key); return <div className="settings-row" key={item.key}><div><h4>{item.key.replace(/([A-Z])/g, " $1").replace(/^./, (letter) => letter.toUpperCase())}</h4><p>{item.description}</p></div>{typeof item.value === "boolean" ? <button className="switch" data-on={item.value} aria-label={`Toggle ${item.key}`} onClick={() => setSettings((current) => current.map((setting, position) => position === index ? { ...setting, value: !setting.value } : setting))}><span /></button> : <input className="settings-input" type={typeof item.value === "number" ? "number" : "text"} value={String(item.value)} onChange={(event) => setSettings((current) => current.map((setting, position) => position === index ? { ...setting, value: typeof item.value === "number" ? Number(event.target.value) : event.target.value } : setting))} />}</div>; };
  return <div className="settings-page"><div className="settings-grid"><Card className="settings-card"><CardHeader title="System behaviour" description="Security, verification, notification, and audit controls" />{behavior.map(row)}</Card><Card className="settings-card"><CardHeader title="Academic thresholds" description="Attendance sessions, GPA warnings, and risk thresholds" />{thresholds.map(row)}</Card></div><div className="settings-actions"><span>Changes apply across attendance, grading, and academic-risk workflows.</span><div><Button variant="secondary" onClick={() => void load()}>Reset Unsaved</Button><Button disabled={saving} onClick={() => void save()}>{saving ? "Saving…" : "Save Settings"}</Button></div></div></div>;
}
