"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { AlertTriangle, BookCopy, CheckCircle2, Eye, FileDown, GraduationCap, RotateCcw, Save, ScrollText, Settings2, ShieldCheck, UsersRound, X } from "lucide-react";
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
    let active = true;
    const load = () => Promise.all([
      apiRequest<AdminAnalytics>("/analytics/admin"),
      apiRequest<RecentAudit[]>("/audit?take=6"),
    ]).then(([analytics, audit]) => {
      if (!active) return;
      setData(analytics);
      setActivity(audit.slice(0, 6));
    }).catch((error) => toast("Dashboard could not be loaded", error instanceof ApiError ? error.message : "Please retry.", "danger"));
    void load();
    const timer = window.setInterval(load, 30_000);
    return () => { active = false; window.clearInterval(timer); };
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
      <div className="dashboard-summary-grid">
        <Card className="academic-summary-card">
          <CardHeader title="Live academic summary" description="Current institutional health from verified records" />
          <div className="academic-summary-metrics">
            <div className="academic-summary-metric"><span className="academic-summary-metric__icon"><BookCopy size={19} /></span><div><strong>{data.totalCourses}</strong><span>Active course definitions</span></div><small>Catalogue</small></div>
            <div className="academic-summary-metric"><span className="academic-summary-metric__icon academic-summary-metric__icon--gold"><GraduationCap size={19} /></span><div><strong>{data.averageGrade.toFixed(1)}%</strong><span>Published grade average</span></div><small>Performance</small></div>
            <div className="academic-summary-metric"><span className="academic-summary-metric__icon academic-summary-metric__icon--green"><CheckCircle2 size={19} /></span><div><strong>{data.attendanceRate.toFixed(1)}%</strong><span>Present and late attendance</span></div><small>Attendance</small></div>
          </div>
          <div className="academic-summary-footer"><span>Live database connection</span><Link href="/admin/analytics">Open full analytics →</Link></div>
        </Card>
        <Card className="recent-activity-card">
          <CardHeader title="Recent system activity" description="Automatically refreshes every 30 seconds" />
          <div className="activity-list activity-list--dashboard">
            {activity.length ? activity.map((item) => (
              <div className="activity" key={item.id}>
                <span className="activity__icon"><ScrollText size={16} /></span>
                <div><strong>{item.action.replaceAll("_", " ")}</strong><p>{item.description} · {item.actor ? `${item.actor.firstName} ${item.actor.lastName}` : "System"}</p></div>
                <time>{new Date(item.createdAt).toLocaleString([], { month: "short", day: "numeric", hour: "2-digit", minute: "2-digit" })}</time>
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

type AdminAttendanceSession = {
  id: string; method: string; status: string; startsAt: string; expiresAt: string; radiusMetres: number;
  course: {
    id: string; code: string; title: string;
    programmes: Array<{ programme: { id: string; code: string; name: string } }>;
    offerings: Array<{ period: { academicYear: string; semester: string } }>;
  };
  lecturer: { id: string; firstName: string; lastName: string; staffNumber: string | null };
  records: Array<{ status: string }>;
  _count: { records: number };
};

const emptyAttendanceFilters = {
  programmeId: "", courseId: "", lecturerId: "", from: "", to: "",
  status: "", method: "", academicYear: "", semester: "",
};

export function LiveAdminAttendance() {
  const { toast } = useToast();
  const [sessions, setSessions] = useState<AdminAttendanceSession[]>([]);
  const [filters, setFilters] = useState(emptyAttendanceFilters);
  const [loading, setLoading] = useState(true);
  const [selected, setSelected] = useState<AdminAttendanceSession | null>(null);
  async function load(next = filters) {
    setLoading(true);
    try {
      const query = new URLSearchParams(Object.entries(next).filter(([, value]) => value));
      setSessions(await apiRequest<AdminAttendanceSession[]>(`/attendance/admin/sessions?${query}`));
    } catch (error) {
      toast("Attendance sessions could not be loaded", error instanceof ApiError ? error.message : "Please retry.", "danger");
    } finally { setLoading(false); }
  }
  useEffect(() => { void load(emptyAttendanceFilters); }, []);
  const courses = Array.from(new Map(sessions.map((item) => [item.course.id, item.course])).values());
  const lecturers = Array.from(new Map(sessions.map((item) => [item.lecturer.id, item.lecturer])).values());
  const programmes = Array.from(new Map(sessions.flatMap((item) => item.course.programmes.map(({ programme }) => [programme.id, programme] as const))).values());
  const periods = Array.from(new Set(sessions.flatMap((item) => item.course.offerings.map(({ period }) => period.academicYear))));
  const count = (session: AdminAttendanceSession, status: string) => session.records.filter((record) => record.status === status).length;
  async function exportAttendance() {
    try {
      const report = await apiRequest<ReportResult>("/reports/attendance", { method: "POST", body: JSON.stringify(filters) });
      downloadReport(report);
      toast("Attendance export ready", `${report.rows.length} attendance record(s) exported.`, "success");
    } catch (error) { toast("Export failed", error instanceof ApiError ? error.message : "Please retry.", "danger"); }
  }
  const field = (key: keyof typeof filters, value: string) => setFilters((current) => ({ ...current, [key]: value }));
  return <div className="stack">
    <PageHeader title="Attendance Management" description="Review sessions across programmes, courses, lecturers, classes, and academic periods." />
    <Card>
      <div className="attendance-admin-filters">
        <div className="form-field"><label>Programme / class</label><select value={filters.programmeId} onChange={(event) => field("programmeId", event.target.value)}><option value="">All programmes</option>{programmes.map((item) => <option key={item.id} value={item.id}>{item.code} — {item.name}</option>)}</select></div>
        <div className="form-field"><label>Course</label><select value={filters.courseId} onChange={(event) => field("courseId", event.target.value)}><option value="">All courses</option>{courses.map((item) => <option key={item.id} value={item.id}>{item.code} — {item.title}</option>)}</select></div>
        <div className="form-field"><label>Lecturer</label><select value={filters.lecturerId} onChange={(event) => field("lecturerId", event.target.value)}><option value="">All lecturers</option>{lecturers.map((item) => <option key={item.id} value={item.id}>{item.firstName} {item.lastName}</option>)}</select></div>
        <div className="form-field"><label>From</label><input type="date" value={filters.from} onChange={(event) => field("from", event.target.value)} /></div>
        <div className="form-field"><label>To</label><input type="date" value={filters.to} onChange={(event) => field("to", event.target.value)} /></div>
        <div className="form-field"><label>Session status</label><select value={filters.status} onChange={(event) => field("status", event.target.value)}><option value="">All statuses</option>{["ACTIVE", "CLOSED", "EXPIRED", "CANCELLED"].map((item) => <option key={item}>{item}</option>)}</select></div>
        <div className="form-field"><label>Attendance method</label><select value={filters.method} onChange={(event) => field("method", event.target.value)}><option value="">All methods</option><option>PIN</option><option>QR</option></select></div>
        <div className="form-field"><label>Academic year</label><select value={filters.academicYear} onChange={(event) => field("academicYear", event.target.value)}><option value="">All periods</option>{periods.map((item) => <option key={item}>{item}</option>)}</select></div>
        <div className="form-field"><label>Semester</label><select value={filters.semester} onChange={(event) => field("semester", event.target.value)}><option value="">All semesters</option><option value="FIRST">First semester</option><option value="SECOND">Second semester</option></select></div>
      </div>
      <div className="form-actions"><Button variant="secondary" onClick={() => { setFilters(emptyAttendanceFilters); void load(emptyAttendanceFilters); }}><RotateCcw size={16} /> Reset</Button><Button variant="secondary" onClick={() => void exportAttendance()}><FileDown size={16} /> Export filtered CSV</Button><Button onClick={() => void load()}>Apply filters</Button></div>
    </Card>
    <Card className="table-shell">
      <div className="table-wrap"><table><thead><tr><th>Session</th><th>Programme / class</th><th>Lecturer</th><th>Date</th><th>Method</th><th>Present</th><th>Late</th><th>Absent</th><th>Status</th><th>Details</th></tr></thead><tbody>
        {!loading && sessions.map((session) => <tr key={session.id}><td><strong>{session.course.code}</strong><br /><span className="table-subtext">{session.course.title}</span></td><td>{session.course.programmes.map(({ programme }) => programme.code).join(", ") || "Unassigned"}</td><td>{session.lecturer.firstName} {session.lecturer.lastName}</td><td>{new Date(session.startsAt).toLocaleString()}</td><td><Badge tone="info">{session.method}</Badge></td><td>{count(session, "PRESENT")}</td><td>{count(session, "LATE")}</td><td>{count(session, "ABSENT")}</td><td><Badge tone={session.status === "ACTIVE" ? "success" : "neutral"}>{session.status}</Badge></td><td><button className="icon-button" aria-label={`View ${session.course.code} session`} onClick={() => setSelected(session)}><Eye size={16} /></button></td></tr>)}
        {!loading && !sessions.length ? <tr><td colSpan={10} className="selection-empty">No attendance sessions match these filters.</td></tr> : null}
        {loading ? <tr><td colSpan={10} className="selection-empty">Loading attendance sessions…</td></tr> : null}
      </tbody></table></div>
    </Card>
    {selected ? <div className="modal-backdrop" role="presentation" onMouseDown={(event) => { if (event.target === event.currentTarget) setSelected(null); }}><section className="modal" role="dialog" aria-modal="true"><div className="modal__head"><div><h3>{selected.course.code} session</h3><p>{selected.course.title} · {new Date(selected.startsAt).toLocaleString()}</p></div><button className="modal__close" onClick={() => setSelected(null)} aria-label="Close"><X size={17} /></button></div><div className="modal__body"><div className="course-summary"><div><span>Lecturer</span><strong>{selected.lecturer.firstName} {selected.lecturer.lastName}</strong></div><div><span>Method</span><strong>{selected.method}</strong></div><div><span>Geofence</span><strong>{selected.radiusMetres}m</strong></div><div><span>Total records</span><strong>{selected._count.records}</strong></div></div></div></section></div> : null}
  </div>;
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
  return <><PageHeader title="Reports Centre" description="Generate audited CSV reports from current PostgreSQL records." /><Card><CardHeader title="Report type" description="Choose the live dataset to generate" /><div className="report-options">{reportTypes.map(([value, label]) => <label className="report-option" data-checked={type === value} key={value}><input type="radio" checked={type === value} onChange={() => setType(value)} /><strong>{label}</strong><span>Generated from the current system records.</span></label>)}</div><div className="form-actions"><Button variant="secondary" disabled={loading} onClick={() => void generate(false)}>Preview</Button><Button disabled={loading} onClick={() => void generate(true)}><FileDown size={16} /> {loading ? "Generating…" : "Generate CSV"}</Button></div></Card>{preview ? <Card className="table-shell" style={{ marginTop: 17 }}><div style={{ padding: 18 }}><CardHeader title="Report preview" description={`${preview.rows.length} rows · generated ${new Date(preview.generatedAt).toLocaleString()}`} action={<button className="icon-button" aria-label="Close report preview" title="Close preview" onClick={() => setPreview(null)}><X size={17} /></button>} /></div><div className="table-wrap"><table><thead><tr>{preview.columns.map((column) => <th key={column}>{column}</th>)}</tr></thead><tbody>{preview.rows.map((row, index) => <tr key={index}>{row.map((value, cell) => <td key={cell}>{value}</td>)}</tr>)}</tbody></table></div></Card> : null}</>;
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
  async function load() { try { const records = await apiRequest<Setting[]>("/settings"); const defaults: Setting[] = [{ id: "behavior-gps", key: "requireGpsGeofencing", value: true, description: "Students must be inside the configured classroom radius." }, { id: "behavior-location", key: "flagSuspiciousLocation", value: true, description: "Flag low-accuracy or suspicious attendance coordinates." }, { id: "behavior-notifications", key: "enableAcademicAlerts", value: true, description: "Send attendance, grade, standing, and risk notifications." }, { id: "behavior-audit", key: "enforceGradeEditReasons", value: true, description: "Require and audit reasons for published-grade corrections." }, { id: "attendance-qr", key: "qrRotationSeconds", value: 20, description: "Seconds before a live QR attendance code rotates." }, { id: "attendance-duration", key: "defaultSessionDurationMinutes", value: 15, description: "Default duration applied when a lecturer starts a session." }, { id: "attendance-late", key: "defaultLateAfterMinutes", value: 10, description: "Students submitting after this many minutes are marked late." }, { id: "attendance-radius", key: "defaultGpsRadiusMetres", value: 50, description: "Default classroom geofence radius in metres." }, { id: "attendance-absence", key: "absenceLimit", value: 3, description: "Absences allowed before the exam-eligibility warning is triggered." }]; const descriptions = new Map(defaults.map((item) => [item.key, item.description])); setSettings([...records.map((item) => ({ ...item, description: item.description ?? descriptions.get(item.key) ?? null })), ...defaults.filter((item) => !records.some((record) => record.key === item.key))]); } catch (error) { toast("Settings could not be loaded", error instanceof ApiError ? error.message : "Please retry.", "danger"); } }
  useEffect(() => { void load(); }, []);
  async function save() {
    setSaving(true);
    try { await apiRequest("/settings", { method: "PATCH", body: JSON.stringify({ settings: Object.fromEntries(settings.map((item) => [item.key, item.value])) }) }); toast("Settings saved", "Thresholds now apply to the live system.", "success"); await load(); } catch (error) { toast("Settings could not be saved", error instanceof ApiError ? error.message : "Please retry.", "danger"); } finally { setSaving(false); }
  }
  const attendanceKeys = new Set(["qrRotationSeconds", "defaultSessionDurationMinutes", "defaultLateAfterMinutes", "defaultGpsRadiusMetres", "absenceLimit", "minimumAttendancePercentage"]);
  const behavior = settings.filter((item) => typeof item.value === "boolean");
  const attendance = settings.filter((item) => attendanceKeys.has(item.key));
  const general = settings.filter((item) => typeof item.value !== "boolean" && !attendanceKeys.has(item.key) && item.key !== "lateThresholdMinutes");
  const row = (item: Setting) => { const index = settings.findIndex((setting) => setting.key === item.key); return <div className="settings-row" key={item.key}><div><h4>{item.key.replace(/([A-Z])/g, " $1").replace(/^./, (letter) => letter.toUpperCase())}</h4><p>{item.description}</p></div>{typeof item.value === "boolean" ? <button className="switch" data-on={item.value} aria-label={`Toggle ${item.key}`} onClick={() => setSettings((current) => current.map((setting, position) => position === index ? { ...setting, value: !setting.value } : setting))}><span /></button> : <input className="settings-input" type={typeof item.value === "number" ? "number" : "text"} value={String(item.value)} onChange={(event) => setSettings((current) => current.map((setting, position) => position === index ? { ...setting, value: typeof item.value === "number" ? Number(event.target.value) : event.target.value } : setting))} />}</div>; };
  return <div className="settings-page">
    <div className="settings-hero"><div className="settings-hero__icon"><Settings2 size={24} /></div><div><h2>System configuration</h2><p>Manage institutional identity, attendance rules, security, and academic safeguards from one place.</p></div><div className="settings-hero__actions"><Button variant="secondary" onClick={() => void load()}><RotateCcw size={16} /> Reset unsaved</Button><Button disabled={saving} onClick={() => void save()}><Save size={16} /> {saving ? "Saving…" : "Save changes"}</Button></div></div>
    <div className="settings-sections">
      <Card className="settings-card"><div className="settings-section-heading"><span><ShieldCheck size={19} /></span><div><h3>System behaviour</h3><p>Verification, notification, and audit controls.</p></div></div>{behavior.map(row)}</Card>
      <Card className="settings-card settings-card--attendance"><div className="settings-section-heading"><span><CheckCircle2 size={19} /></span><div><h3>Attendance policies</h3><p>Defaults applied to every new lecturer attendance session.</p></div></div>{attendance.map(row)}</Card>
      {general.length ? <Card className="settings-card settings-card--wide"><div className="settings-section-heading"><span><BookCopy size={19} /></span><div><h3>Institutional and academic settings</h3><p>General system values and academic thresholds.</p></div></div><div className="settings-card__columns">{general.map(row)}</div></Card> : null}
    </div>
    <div className="settings-actions"><span>Policy changes take effect for newly created attendance sessions. Every update is recorded in the audit log.</span><strong>{settings.length} configured controls</strong></div>
  </div>;
}
