"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { AlertTriangle, Award, Bell, BookOpenText, CheckCircle2, Clock3, GraduationCap, History, MapPinCheck, ShieldCheck } from "lucide-react";
import { Avatar, Badge, Button, Card, CardHeader, Progress, StatCard } from "@classconnect/ui";
import { ApiError, apiRequest, authApi } from "@/lib/api/client";
import type { SessionUser } from "@/lib/types";
import { useToast } from "./toast-provider";
import { AttendanceCheckIn } from "./attendance-check-in";
import { NotificationCentre } from "./notification-centre";

type Course = {
  id: string; code: string; title: string; creditHours: number; status: string;
  offerings: Array<{ id: string; status: string; period: { academicYear: string; semester: string }; lecturer: { firstName: string; lastName: string } | null }>;
};
type Attendance = { id: string; status: string; method: string; distanceMetres: number | string | null; markedAt: string; session: { id: string; startsAt: string; course: Course } };
type Grade = { id: string; rawMark: number | string; percentage: number | string; weightedMark: number | string; status: string; publishedAt: string | null; assessment: { id: string; title: string; type: string; maximumMark: number | string; weight: number | string; course: Course } };
type Risk = { id: string; riskLevel: string; reason: string; recommendation: string; course: Course | null };
type Standing = { currentGpa: number | string; attendancePercentage: number | string; status: string; reason: string | null; calculatedAt: string };
type Analytics = { standing: Standing | null; risks: Risk[]; grades: Grade[]; attendance: Array<{ status: string; _count: number }> };
type Notification = { id: string; type: string; title: string; message: string; readAt: string | null; createdAt: string };

function errorMessage(error: unknown) { return error instanceof ApiError ? error.message : "Please try again."; }
function tone(status: string) {
  if (["PRESENT", "PUBLISHED", "CORRECTED", "GOOD", "LOW"].includes(status)) return "success" as const;
  if (["FLAGGED", "FAILED", "PROBATION", "HIGH", "CRITICAL"].includes(status)) return "danger" as const;
  if (["LATE", "WARNING", "MEDIUM", "DRAFT"].includes(status)) return "warning" as const;
  return "info" as const;
}

function useStudentRecords() {
  const { toast } = useToast();
  const [courses, setCourses] = useState<Course[]>([]);
  const [grades, setGrades] = useState<Grade[]>([]);
  const [attendance, setAttendance] = useState<Attendance[]>([]);
  const [analytics, setAnalytics] = useState<Analytics | null>(null);
  const [loading, setLoading] = useState(true);
  async function load() {
    setLoading(true);
    try {
      const [courseRows, gradeRows, attendanceRows, analyticsRow] = await Promise.all([
        apiRequest<Course[]>("/courses"),
        apiRequest<Grade[]>("/students/me/grades"),
        apiRequest<Attendance[]>("/attendance/student/history"),
        apiRequest<Analytics>("/analytics/student"),
      ]);
      setCourses(courseRows); setGrades(gradeRows); setAttendance(attendanceRows); setAnalytics(analyticsRow);
    } catch (error) { toast("Student records could not be loaded", errorMessage(error), "danger"); }
    finally { setLoading(false); }
  }
  useEffect(() => { void load(); }, []);
  return { courses, grades, attendance, analytics, loading };
}

function Empty({ children }: { children: string }) { return <Card><p className="selection-empty">{children}</p></Card>; }

export function LiveStudentDashboard() {
  const { courses, grades, attendance, analytics, loading } = useStudentRecords();
  if (loading) return <Card>Loading your academic record…</Card>;
  const totalAttendance = attendance.length;
  const attended = attendance.filter((item) => ["PRESENT", "LATE"].includes(item.status)).length;
  const attendanceRate = totalAttendance ? attended / totalAttendance * 100 : Number(analytics?.standing?.attendancePercentage ?? 0);
  const average = grades.length ? grades.reduce((sum, item) => sum + Number(item.percentage), 0) / grades.length : 0;
  const highestRisk = analytics?.risks[0];
  return <div className="stack"><div className="page-header page-header--actions"><div className="page-header__actions"><Link className="ui-button ui-button--primary ui-button--md" href="/student/attendance"><MapPinCheck size={16} /> Mark attendance</Link></div></div>{highestRisk ? <div className={`alert-card alert-card--${tone(highestRisk.riskLevel) === "danger" ? "danger" : "warning"}`}><span className="alert-card__icon"><AlertTriangle size={17} /></span><div><h3>{highestRisk.riskLevel} academic risk</h3><p>{highestRisk.reason} {highestRisk.recommendation}</p></div></div> : null}<div className="grid grid--4"><StatCard label="Current GPA" value={Number(analytics?.standing?.currentGpa ?? 0).toFixed(2)} icon={<GraduationCap size={20} />} /><StatCard label="Overall attendance" value={`${attendanceRate.toFixed(1)}%`} icon={<CheckCircle2 size={20} />} /><StatCard label="Published average" value={`${average.toFixed(1)}%`} icon={<BookOpenText size={20} />} /><StatCard label="Academic standing" value={(analytics?.standing?.status ?? "Pending").replace("_", " ")} icon={<Award size={20} />} /></div>{courses.length ? <Card className="table-shell"><div style={{ padding: 18 }}><CardHeader title="My registered courses" description="Courses assigned to your student account" /></div><div className="table-wrap"><table><thead><tr><th>Course</th><th>Credits</th><th>Published assessments</th><th>Attendance records</th><th>Status</th></tr></thead><tbody>{courses.map((course) => <tr key={course.id}><td><strong>{course.code}</strong><br /><span className="table-subtext">{course.title}</span></td><td>{course.creditHours}</td><td>{grades.filter((item) => item.assessment.course.id === course.id).length}</td><td>{attendance.filter((item) => item.session.course.id === course.id).length}</td><td><Badge tone={course.status === "ACTIVE" ? "success" : "neutral"}>{course.status}</Badge></td></tr>)}</tbody></table></div></Card> : <Empty>You have not been added to any classes yet.</Empty>}</div>;
}

export function LiveStudentAttendance() { return <AttendanceCheckIn />; }

export function LiveStudentAttendanceHistory() {
  const { attendance, loading } = useStudentRecords();
  const grouped = useMemo(() => Array.from(attendance.reduce((map, item) => {
    const current = map.get(item.session.course.id) ?? { course: item.session.course, rows: [] as Attendance[] };
    current.rows.push(item); map.set(item.session.course.id, current); return map;
  }, new Map<string, { course: Course; rows: Attendance[] }>()).values()), [attendance]);
  if (loading) return <Card>Loading attendance history…</Card>;
  const attended = attendance.filter((item) => ["PRESENT", "LATE"].includes(item.status)).length;
  return <div className="stack"><div className="grid grid--4"><StatCard label="Attendance records" value={attendance.length} icon={<History size={20} />} /><StatCard label="Present" value={attendance.filter((item) => item.status === "PRESENT").length} icon={<CheckCircle2 size={20} />} /><StatCard label="Late" value={attendance.filter((item) => item.status === "LATE").length} icon={<Clock3 size={20} />} /><StatCard label="Overall rate" value={`${(attendance.length ? attended / attendance.length * 100 : 0).toFixed(1)}%`} icon={<MapPinCheck size={20} />} /></div><Card className="table-shell"><div className="table-wrap"><table><thead><tr><th>Course</th><th>Records</th><th>Present</th><th>Late</th><th>Flagged</th><th>Rate</th></tr></thead><tbody>{grouped.map(({ course, rows }) => { const valid = rows.filter((item) => ["PRESENT", "LATE"].includes(item.status)).length; const rate = rows.length ? valid / rows.length * 100 : 0; return <tr key={course.id}><td><strong>{course.code}</strong><br /><span className="table-subtext">{course.title}</span></td><td>{rows.length}</td><td>{rows.filter((item) => item.status === "PRESENT").length}</td><td>{rows.filter((item) => item.status === "LATE").length}</td><td>{rows.filter((item) => item.status === "FLAGGED").length}</td><td><div style={{ minWidth: 130 }}><Progress value={rate} tone={rate < 75 ? "danger" : "success"} /></div><span>{rate.toFixed(1)}%</span></td></tr>; })}</tbody></table></div></Card></div>;
}

export function LiveStudentGrades() {
  const { grades, analytics, loading } = useStudentRecords();
  if (loading) return <Card>Loading published grades…</Card>;
  const average = grades.length ? grades.reduce((sum, item) => sum + Number(item.percentage), 0) / grades.length : 0;
  return <div className="stack"><div className="grid grid--4"><StatCard label="Current GPA" value={Number(analytics?.standing?.currentGpa ?? 0).toFixed(2)} icon={<GraduationCap size={20} />} /><StatCard label="Published grades" value={grades.length} icon={<BookOpenText size={20} />} /><StatCard label="Assessment average" value={`${average.toFixed(1)}%`} icon={<Award size={20} />} /><StatCard label="Courses graded" value={new Set(grades.map((item) => item.assessment.course.id)).size} icon={<CheckCircle2 size={20} />} /></div>{grades.length ? <Card className="table-shell"><div className="table-wrap"><table><thead><tr><th>Course</th><th>Assessment</th><th>Type</th><th>Raw mark</th><th>Percentage</th><th>Weight earned</th><th>Status</th></tr></thead><tbody>{grades.map((grade) => <tr key={grade.id}><td><strong>{grade.assessment.course.code}</strong><br /><span className="table-subtext">{grade.assessment.course.title}</span></td><td>{grade.assessment.title}</td><td>{grade.assessment.type.replace("_", " ")}</td><td>{Number(grade.rawMark)} / {Number(grade.assessment.maximumMark)}</td><td>{Number(grade.percentage).toFixed(1)}%</td><td>{Number(grade.weightedMark).toFixed(1)} / {Number(grade.assessment.weight)}</td><td><Badge tone={tone(grade.status)}>{grade.status}</Badge></td></tr>)}</tbody></table></div></Card> : <Empty>No grades have been published for you yet.</Empty>}</div>;
}

export function LiveStudentAnalytics() {
  const { grades, attendance, analytics, loading } = useStudentRecords();
  if (loading) return <Card>Calculating your academic indicators…</Card>;
  const average = grades.length ? grades.reduce((sum, item) => sum + Number(item.percentage), 0) / grades.length : 0;
  const valid = attendance.filter((item) => ["PRESENT", "LATE"].includes(item.status)).length;
  const attendanceRate = attendance.length ? valid / attendance.length * 100 : 0;
  return <div className="grid grid--main"><div className="stack"><Card><CardHeader title="Current performance signals" description="Calculated from published grades and verified attendance" /><div className="settings-row"><div><h4>Published grade average</h4><p>Across all currently published assessments</p></div><strong>{average.toFixed(1)}%</strong></div><div className="settings-row"><div><h4>Verified attendance rate</h4><p>Present and late records count as attended</p></div><strong>{attendanceRate.toFixed(1)}%</strong></div><div className="settings-row"><div><h4>Current GPA</h4><p>Latest calculated academic standing record</p></div><strong>{Number(analytics?.standing?.currentGpa ?? 0).toFixed(2)}</strong></div></Card></div><Card><CardHeader title="Active warnings and recommendations" description="Generated from your current academic record" />{analytics?.risks.length ? analytics.risks.map((risk) => <div className="activity" key={risk.id}><span className="activity__icon"><AlertTriangle size={17} /></span><div><strong>{risk.course?.code ?? "Overall"} · {risk.riskLevel}</strong><p>{risk.reason}<br />{risk.recommendation}</p></div><Badge tone={tone(risk.riskLevel)}>{risk.riskLevel}</Badge></div>) : <p className="selection-empty">There are no active academic-risk warnings.</p>}</Card></div>;
}

export function LiveStudentStanding() {
  const { analytics, loading } = useStudentRecords();
  if (loading) return <Card>Loading academic standing…</Card>;
  const standing = analytics?.standing;
  return <div className="grid grid--main"><Card className="student-standing-card" data-tone={tone(standing?.status ?? "PENDING")}><Badge tone={tone(standing?.status ?? "PENDING")}>Current standing</Badge><h3>{standing?.status?.replace("_", " ") ?? "Pending calculation"}</h3><p>{standing?.reason ?? "Your standing will be calculated after attendance and grades are available."}</p><div className="course-summary"><div><span>Current GPA</span><strong>{Number(standing?.currentGpa ?? 0).toFixed(2)}</strong></div><div><span>Attendance</span><strong>{Number(standing?.attendancePercentage ?? 0).toFixed(1)}%</strong></div><div><span>Open warnings</span><strong>{analytics?.risks.length ?? 0}</strong></div></div></Card><Card><CardHeader title="Progression guidance" description="The system updates this record as approved results change" /><div className="activity-list"><div className="activity"><span className="activity__icon"><CheckCircle2 size={17} /></span><div><strong>Good standing</strong><p>Maintain the configured GPA and attendance requirements.</p></div></div><div className="activity"><span className="activity__icon"><AlertTriangle size={17} /></span><div><strong>Academic warning</strong><p>Review active recommendations and contact your lecturer where support is needed.</p></div></div></div></Card></div>;
}

export function LiveStudentTimetable() {
  const { courses, loading } = useStudentRecords();
  if (loading) return <Card>Loading registered classes…</Card>;
  return <div className="stack"><div className="grid grid--3"><StatCard label="Registered courses" value={courses.length} icon={<BookOpenText size={20} />} /><StatCard label="Total credits" value={courses.reduce((sum, item) => sum + item.creditHours, 0)} icon={<Award size={20} />} /><StatCard label="Active offerings" value={courses.filter((item) => item.offerings.some((offering) => offering.status === "ACTIVE")).length} icon={<CheckCircle2 size={20} />} /></div><Card className="table-shell"><div style={{ padding: 18 }}><CardHeader title="Registered courses" description="Courses currently assigned to your student account" /></div><div className="table-wrap"><table><thead><tr><th>Course</th><th>Academic period</th><th>Lecturer</th><th>Credits</th><th>Offering status</th></tr></thead><tbody>{courses.map((course) => { const offering = course.offerings.find((item) => item.status === "ACTIVE"); return <tr key={course.id}><td><strong>{course.code}</strong><br /><span className="table-subtext">{course.title}</span></td><td>{offering ? `${offering.period.academicYear} · ${offering.period.semester.replace("_", " ")}` : "No active offering"}</td><td>{offering?.lecturer ? `${offering.lecturer.firstName} ${offering.lecturer.lastName}` : "Not assigned"}</td><td>{course.creditHours}</td><td><Badge tone={offering ? "success" : "neutral"}>{offering ? "ACTIVE" : "INACTIVE"}</Badge></td></tr>; })}</tbody></table></div></Card></div>;
}

export function LiveStudentNotifications() {
  return <NotificationCentre />;
}

export function LiveStudentProfile() {
  const { toast } = useToast(); const [user, setUser] = useState<SessionUser | null>(null);
  useEffect(() => { authApi.me().then((result) => setUser(result.user)).catch((error) => toast("Profile could not be loaded", errorMessage(error), "danger")); }, []);
  if (!user) return <Card>Loading your profile…</Card>;
  const name = `${user.firstName} ${user.lastName}`;
  return <div className="grid grid--main"><Card><div className="profile-summary"><Avatar name={name} size="lg" /><div><h3>{name}</h3><p>{user.studentNumber} · {user.status}</p><Badge tone={user.status === "ACTIVE" ? "success" : "warning"}>{user.status}</Badge></div></div><div className="form-grid"><div className="form-field"><label>Full name</label><input readOnly value={name} /></div><div className="form-field"><label>Institutional email</label><input readOnly value={user.email} /></div><div className="form-field"><label>Student ID</label><input readOnly value={user.studentNumber ?? ""} /></div><div className="form-field"><label>Programme</label><input readOnly value={user.programme?.name ?? "Not assigned"} /></div><div className="form-field"><label>Department</label><input readOnly value={user.department?.name ?? "Not assigned"} /></div><div className="form-field"><label>Faculty</label><input readOnly value={user.department?.faculty.name ?? "Not assigned"} /></div></div></Card><Card><CardHeader title="Account and academic support" description="Your institutional identity is maintained by the administrator" /><div className="activity-list"><div className="activity"><span className="activity__icon"><ShieldCheck size={17} /></span><div><strong>Password status</strong><p>{user.mustChangePassword ? "Temporary password must be changed" : "Password has been changed"}</p></div><Badge tone={user.mustChangePassword ? "warning" : "success"}>{user.mustChangePassword ? "Action needed" : "Secure"}</Badge></div><div className="activity"><span className="activity__icon"><MapPinCheck size={17} /></span><div><strong>Department support</strong><p>Contact the administrator if your identity, programme, or registered courses are incorrect.</p></div></div></div></Card></div>;
}
