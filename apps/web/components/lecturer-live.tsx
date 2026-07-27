"use client";

import { useEffect, useMemo, useState } from "react";
import type { FormEvent } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { AlertTriangle, BookOpenText, CheckCircle2, ClipboardCheck, Maximize2, Play, QrCode, RotateCcw, Send, Trash2, UsersRound, X } from "lucide-react";
import { QRCodeSVG } from "qrcode.react";
import { Avatar, Badge, Button, Card, CardHeader, StatCard } from "@classconnect/ui";
import { ApiError, apiRequest } from "@/lib/api/client";
import { getBestGeolocation } from "@/lib/geolocation";
import { NotificationCentre } from "./notification-centre";
import { useToast } from "./toast-provider";

type Course = {
  id: string; code: string; title: string; creditHours: number; status: string;
  _count: { students: number; lecturers: number };
  offerings: Array<{ id: string; status: string; period: { academicYear: string; semester: string } }>;
};
type Session = {
  id: string; startsAt: string; expiresAt: string; status: string; method: "PIN" | "QR"; radiusMetres: number;
  latitude?: number | string | null; longitude?: number | string | null; locationAccuracy?: number | null; lateAfterMinutes?: number;
  course: { id: string; code: string; title: string };
  records?: Array<{ status: string }>; _count: { records: number };
  pin?: string; qrToken?: string;
};
type LiveSession = Omit<Session, "records"> & {
  records: Array<{
    id: string; status: string; method: string; markedAt: string;
    distanceMetres: number | string | null; flaggedReason: string | null;
    student: Pick<Student, "id" | "firstName" | "lastName" | "studentNumber">;
  }>;
};
type Student = {
  id: string; firstName: string; lastName: string; studentNumber: string | null; email: string;
  programme: { name: string; code: string } | null;
  academicStanding: { currentGpa: number | string; attendancePercentage: number | string; status: string } | null;
  riskAlerts: Array<{ id: string; riskLevel: string; reason: string; recommendation: string }>;
};
type CourseDetail = Course & { students: Array<{ student: Student }> };
type Assessment = {
  id: string; title: string; type: string; maximumMark: number | string; weight: number | string; status: string;
  grades?: Array<{ id: string; studentId: string; rawMark: number | string; status: string; student: Pick<Student, "id" | "firstName" | "lastName" | "studentNumber"> }>;
};
type Notification = { id: string; title: string; message: string; createdAt: string; readAt: string | null; type: string };
type Analytics = { course: Course & { _count: { students: number } }; grades: { _avg: { percentage: number | string | null }; _min: { percentage: number | string | null }; _max: { percentage: number | string | null } }; attendance: Array<{ status: string; _count: number }> };

function message(error: unknown) {
  return error instanceof ApiError ? error.message : "Please try again.";
}

function useLecturerData() {
  const { toast } = useToast();
  const [courses, setCourses] = useState<Course[]>([]);
  const [sessions, setSessions] = useState<Session[]>([]);
  const [loading, setLoading] = useState(true);
  async function load() {
    setLoading(true);
    try {
      const [assigned, history] = await Promise.all([
        apiRequest<Course[]>("/courses"),
        apiRequest<Session[]>("/attendance/sessions"),
      ]);
      setCourses(assigned); setSessions(history);
    } catch (error) { toast("Lecturer data could not be loaded", message(error), "danger"); }
    finally { setLoading(false); }
  }
  useEffect(() => { void load(); }, []);
  return { courses, sessions, loading, reload: load };
}

function Empty({ children }: { children: string }) {
  return <Card><p className="selection-empty">{children}</p></Card>;
}

export function LiveLecturerDashboard() {
  const { courses, sessions, loading } = useLecturerData();
  const active = sessions.find((item) => item.status === "ACTIVE");
  const records = sessions.flatMap((item) => item.records ?? []);
  const attended = records.filter((item) => item.status === "PRESENT" || item.status === "LATE").length;
  const attendance = records.length ? attended / records.length * 100 : 0;
  if (loading) return <Card>Loading your teaching workspace…</Card>;
  return <div className="stack">
    <div className="page-header page-header--actions"><div className="page-header__actions"><Link className="ui-button ui-button--primary ui-button--md" href="/lecturer/attendance/new"><QrCode size={16} /> Start attendance</Link></div></div>
    <div className="grid grid--4"><StatCard label="Assigned courses" value={courses.length} icon={<BookOpenText size={20} />} trend="Your teaching load" /><StatCard label="Enrolled seats" value={courses.reduce((sum, item) => sum + item._count.students, 0)} icon={<UsersRound size={20} />} trend="Assigned courses only" /><StatCard label="Attendance records" value={records.length} icon={<ClipboardCheck size={20} />} trend={`${attendance.toFixed(1)}% present/late`} /><StatCard label="Active sessions" value={sessions.filter((item) => item.status === "ACTIVE").length} icon={<CheckCircle2 size={20} />} trend={active ? active.course.code : "None running"} /></div>
    {active ? <Card className="attendance-panel"><div className="attendance-panel__top"><div><h3>{active.course.code} attendance is live</h3><p>{active._count.records} submissions · closes {new Date(active.expiresAt).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}</p></div><span className="live-pill">Live session</span></div><div style={{ position: "relative", zIndex: 1, marginTop: 22 }}><Link className="ui-button ui-button--secondary ui-button--md" href="/lecturer/attendance/live">Open live monitor</Link></div></Card> : null}
    {courses.length ? <Card className="table-shell"><div style={{ padding: 18 }}><CardHeader title="My assigned courses" description="Only courses assigned to your lecturer account are shown" /></div><div className="table-wrap"><table><thead><tr><th>Course</th><th>Students</th><th>Active offering</th><th></th></tr></thead><tbody>{courses.map((course) => <tr key={course.id}><td><strong>{course.code}</strong><br /><span className="table-subtext">{course.title}</span></td><td>{course._count.students}</td><td>{course.offerings.find((item) => item.status === "ACTIVE") ? <Badge tone="success">Active</Badge> : <Badge tone="neutral">No active offering</Badge>}</td><td><Link className="ui-button ui-button--secondary ui-button--sm" href="/lecturer/courses">Open</Link></td></tr>)}</tbody></table></div></Card> : <Empty>No courses have been assigned to your lecturer account yet.</Empty>}
  </div>;
}

export function LiveLecturerCourses() {
  const { courses, sessions, loading } = useLecturerData();
  if (loading) return <Card>Loading assigned courses…</Card>;
  if (!courses.length) return <Empty>No courses have been assigned to you. An administrator must assign a course first.</Empty>;
  return <div className="grid grid--2">{courses.map((course) => {
    const active = sessions.find((item) => item.course.id === course.id && item.status === "ACTIVE");
    const offering = course.offerings.find((item) => item.status === "ACTIVE");
    return <Card key={course.id}><CardHeader title={`${course.code} — ${course.title}`} description={offering ? `${offering.period.academicYear} · ${offering.period.semester.replace("_", " ")}` : `${course.creditHours} credits`} action={<Badge tone={active ? "success" : "info"}>{active ? "Session live" : course.status}</Badge>} /><div className="course-summary"><div><span>Students</span><strong>{course._count.students}</strong></div><div><span>Credits</span><strong>{course.creditHours}</strong></div><div><span>Sessions</span><strong>{sessions.filter((item) => item.course.id === course.id).length}</strong></div></div><div className="card-actions"><Link className="ui-button ui-button--secondary ui-button--sm" href={`/lecturer/analytics?course=${course.id}`}>Analytics</Link><Link className="ui-button ui-button--primary ui-button--sm" href={`/lecturer/grades?course=${course.id}`}>Manage grades</Link></div></Card>;
  })}</div>;
}

export function LiveLecturerAttendanceOverview() {
  const { sessions, loading } = useLecturerData();
  if (loading) return <Card>Loading attendance sessions…</Card>;
  const statuses = sessions.flatMap((item) => item.records ?? []);
  return <div className="stack"><div className="page-header page-header--actions"><div className="page-header__actions"><Link className="ui-button ui-button--primary ui-button--md" href="/lecturer/attendance/new"><QrCode size={16} /> Start session</Link></div></div><div className="grid grid--4"><StatCard label="Sessions" value={sessions.length} icon={<ClipboardCheck size={20} />} /><StatCard label="Submissions" value={statuses.length} icon={<UsersRound size={20} />} /><StatCard label="Present / late" value={statuses.filter((item) => ["PRESENT", "LATE"].includes(item.status)).length} icon={<CheckCircle2 size={20} />} /><StatCard label="Flagged" value={statuses.filter((item) => item.status === "FLAGGED").length} icon={<AlertTriangle size={20} />} trendTone="danger" /></div><Card className="table-shell"><div className="table-wrap"><table><thead><tr><th>Course</th><th>Started</th><th>Present</th><th>Late</th><th>Flagged</th><th>Total</th><th>Status</th></tr></thead><tbody>{sessions.map((session) => <tr key={session.id}><td><strong>{session.course.code}</strong><br /><span className="table-subtext">{session.course.title}</span></td><td>{new Date(session.startsAt).toLocaleString()}</td><td>{session.records?.filter((item) => item.status === "PRESENT").length ?? 0}</td><td>{session.records?.filter((item) => item.status === "LATE").length ?? 0}</td><td>{session.records?.filter((item) => item.status === "FLAGGED").length ?? 0}</td><td>{session._count.records}</td><td><Badge tone={session.status === "ACTIVE" ? "success" : "neutral"}>{session.status}</Badge></td></tr>)}</tbody></table></div></Card></div>;
}

export function LiveCreateSession() {
  const router = useRouter(); const { toast } = useToast();
  const [courses, setCourses] = useState<Course[]>([]); const [courseId, setCourseId] = useState("");
  const [duration, setDuration] = useState(15); const [radius, setRadius] = useState(50); const [late, setLate] = useState(5);
  const [method, setMethod] = useState("PIN"); const [saving, setSaving] = useState(false);
  useEffect(() => { apiRequest<Course[]>("/courses").then((items) => { setCourses(items); setCourseId(items[0]?.id ?? ""); }).catch((error) => toast("Courses could not be loaded", message(error), "danger")); }, []);
  async function submit(event: FormEvent) {
    event.preventDefault(); if (!courseId) return;
    setSaving(true);
    try {
        const position = await getBestGeolocation();
        const session = await apiRequest<Session>("/attendance/sessions", { method: "POST", body: JSON.stringify({ courseId, latitude: position.coords.latitude, longitude: position.coords.longitude, locationAccuracy: position.coords.accuracy, radiusMetres: radius, durationMinutes: duration, lateAfterMinutes: late, method }) });
        sessionStorage.setItem("classconnect-live-session", session.id);
        sessionStorage.removeItem("classconnect-live-pin");
        sessionStorage.removeItem("classconnect-live-qr");
        if (session.pin) sessionStorage.setItem("classconnect-live-pin", session.pin);
        if (session.qrToken) sessionStorage.setItem("classconnect-live-qr", session.qrToken);
        toast("Attendance session started", `${session.course.code} is now accepting ${method} submissions.`, "success"); router.push("/lecturer/attendance/live");
    } catch (error) {
      toast("Session could not be started", error instanceof ApiError ? error.message : "Allow precise location and keep the page open while ClassConnect collects GPS readings.", "danger");
    } finally { setSaving(false); }
  }
  if (!courses.length) return <Empty>You need an assigned course before starting attendance.</Empty>;
  return <div className="grid grid--main"><Card><CardHeader title="Session configuration" description="The browser will use your current location as the classroom centre" /><form onSubmit={submit}><div className="form-grid"><div className="form-field"><label>Assigned course</label><select value={courseId} onChange={(event) => setCourseId(event.target.value)}>{courses.map((course) => <option value={course.id} key={course.id}>{course.code} — {course.title}</option>)}</select></div><div className="form-field"><label>Verification method</label><select value={method} onChange={(event) => setMethod(event.target.value)}><option value="PIN">PIN</option><option value="QR">QR code</option></select></div><div className="form-field"><label>Duration</label><select value={duration} onChange={(event) => setDuration(Number(event.target.value))}><option value={10}>10 minutes</option><option value={15}>15 minutes</option><option value={30}>30 minutes</option><option value={60}>60 minutes</option></select></div><div className="form-field"><label>Allowed radius</label><select value={radius} onChange={(event) => setRadius(Number(event.target.value))}><option value={25}>25 metres</option><option value={50}>50 metres</option><option value={75}>75 metres</option><option value={100}>100 metres</option></select></div><div className="form-field"><label>Mark late after</label><select value={late} onChange={(event) => setLate(Number(event.target.value))}><option value={0}>Immediately</option><option value={5}>5 minutes</option><option value={10}>10 minutes</option><option value={15}>15 minutes</option></select></div></div><div className="form-actions"><Button disabled={saving} type="submit"><Play size={16} /> {saving ? "Starting…" : "Start session"}</Button></div></form></Card><Card><CardHeader title="Geofence protection" description="Students must be registered for the course and physically inside this radius" /><div className="gps-status"><div className="gps-radar"><span /></div><div><h4>Location captured on start</h4><p>For the best result, start the session from inside the classroom and allow precise location access.</p></div></div></Card></div>;
}

export function LiveSessionMonitor() {
  const { toast } = useToast(); const [session, setSession] = useState<LiveSession | null>(null);
  const [confirmClose, setConfirmClose] = useState(false);
  const [projecting, setProjecting] = useState(false);
  const [now, setNow] = useState(() => Date.now());
  const [restarting, setRestarting] = useState(false);
  const [reviewing, setReviewing] = useState<LiveSession["records"][number] | null>(null);
  const [reviewStatus, setReviewStatus] = useState("PRESENT");
  const [reviewReason, setReviewReason] = useState("");
  const [savingReview, setSavingReview] = useState(false);
  const [liveQrToken, setLiveQrToken] = useState("");
  const [livePin, setLivePin] = useState("");
  const [qrRefreshSeconds, setQrRefreshSeconds] = useState(20);
  async function load() {
    try {
      const activeSessions = await apiRequest<Session[]>("/attendance/sessions/active");
      const storedId = sessionStorage.getItem("classconnect-live-session");
      const activeId = activeSessions.some((item) => item.id === storedId) ? storedId : activeSessions[0]?.id;
      const id = activeId ?? storedId;
      if (id) {
        sessionStorage.setItem("classconnect-live-session", id);
        setSession(await apiRequest<LiveSession>(`/attendance/sessions/${id}`));
      }
    } catch (error) { toast("Live session could not be loaded", message(error), "danger"); }
  }
  useEffect(() => { void load(); const timer = setInterval(() => void load(), 5000); return () => clearInterval(timer); }, []);
  useEffect(() => { const timer = setInterval(() => setNow(Date.now()), 1000); return () => clearInterval(timer); }, []);
  useEffect(() => {
    if (!session || session.method !== "QR" || session.status !== "ACTIVE") {
      setLiveQrToken("");
      return;
    }
    let cancelled = false;
    const storedToken = sessionStorage.getItem("classconnect-live-qr") ?? "";
    setLiveQrToken(storedToken);
    setQrRefreshSeconds(20);
    const rotate = async () => {
      try {
        const result = await apiRequest<{ qrToken: string; rotatesInSeconds: number }>(`/attendance/sessions/${session.id}/qr/rotate`, { method: "POST" });
        if (cancelled) return;
        sessionStorage.setItem("classconnect-live-qr", result.qrToken);
        setLiveQrToken(result.qrToken);
        setQrRefreshSeconds(result.rotatesInSeconds);
      } catch (error) {
        if (!cancelled) toast("QR code could not be refreshed", message(error), "danger");
      }
    };
    if (!storedToken) void rotate();
    const rotationTimer = window.setInterval(() => void rotate(), 20_000);
    const countdownTimer = window.setInterval(() => setQrRefreshSeconds((value) => value <= 1 ? 20 : value - 1), 1_000);
    return () => {
      cancelled = true;
      window.clearInterval(rotationTimer);
      window.clearInterval(countdownTimer);
    };
  }, [session?.id, session?.method, session?.status]);
  useEffect(() => {
    if (!session || session.method !== "PIN" || session.status !== "ACTIVE") {
      setLivePin("");
      return;
    }
    const storedPin = sessionStorage.getItem("classconnect-live-pin") ?? "";
    if (storedPin) {
      setLivePin(storedPin);
      return;
    }
    let cancelled = false;
    apiRequest<{ pin: string }>(`/attendance/sessions/${session.id}/pin/reissue`, { method: "POST" })
      .then((result) => {
        if (cancelled) return;
        sessionStorage.setItem("classconnect-live-pin", result.pin);
        setLivePin(result.pin);
      })
      .catch((error) => {
        if (!cancelled) toast("Session PIN could not be loaded", message(error), "danger");
      });
    return () => { cancelled = true; };
  }, [session?.id, session?.method, session?.status]);
  useEffect(() => {
    if (!projecting) return;
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => { document.body.style.overflow = previousOverflow; };
  }, [projecting]);
  async function close() { if (!session) return; try { await apiRequest(`/attendance/sessions/${session.id}/close`, { method: "POST" }); setConfirmClose(false); await load(); toast("Session closed", "No further attendance submissions will be accepted.", "success"); } catch (error) { toast("Session could not be closed", message(error), "danger"); } }
  function openReview(record: LiveSession["records"][number]) {
    setReviewing(record);
    setReviewStatus(record.status === "FLAGGED" ? "PRESENT" : record.status);
    setReviewReason("");
  }
  async function saveReview() {
    if (!reviewing || !reviewReason.trim()) {
      toast("Review reason required", "Explain why the attendance status is being changed.", "warning");
      return;
    }
    setSavingReview(true);
    try {
      await apiRequest(`/attendance/records/${reviewing.id}`, {
        method: "PATCH",
        body: JSON.stringify({ status: reviewStatus, reason: reviewReason.trim() }),
      });
      setReviewing(null);
      await load();
      toast("Attendance reviewed", `${reviewing.student.firstName} is now marked ${reviewStatus.toLowerCase()}.`, "success");
    } catch (error) {
      toast("Attendance could not be updated", message(error), "danger");
    } finally {
      setSavingReview(false);
    }
  }
  async function restart() {
    if (!session || session.latitude == null || session.longitude == null) {
      toast("Session cannot be restarted", "The previous classroom coordinates are unavailable.", "danger");
      return;
    }
    setRestarting(true);
    try {
      const position = await getBestGeolocation();
      const durationMinutes = Math.max(5, Math.round((new Date(session.expiresAt).getTime() - new Date(session.startsAt).getTime()) / 60_000));
      const created = await apiRequest<Session>("/attendance/sessions", {
        method: "POST",
        body: JSON.stringify({
          courseId: session.course.id,
          latitude: position.coords.latitude,
          longitude: position.coords.longitude,
          locationAccuracy: position.coords.accuracy,
          radiusMetres: session.radiusMetres,
          durationMinutes,
          lateAfterMinutes: session.lateAfterMinutes ?? 5,
          method: session.method,
        }),
      });
      sessionStorage.setItem("classconnect-live-session", created.id);
      sessionStorage.removeItem("classconnect-live-pin");
      sessionStorage.removeItem("classconnect-live-qr");
      if (created.pin) {
        sessionStorage.setItem("classconnect-live-pin", created.pin);
        setLivePin(created.pin);
      }
      if (created.qrToken) {
        sessionStorage.setItem("classconnect-live-qr", created.qrToken);
        setLiveQrToken(created.qrToken);
      }
      setNow(Date.now());
      await load();
      toast("Session restarted", `${created.course.code} is accepting attendance with a fresh ${created.qrToken ? "QR code" : "PIN"}.`, "success");
    } catch (error) { toast("Session could not be restarted", message(error), "danger"); }
    finally { setRestarting(false); }
  }
  if (!session) return <Empty>There is no active attendance session. Start one from the Attendance page.</Empty>;
  const pin = session.method === "PIN" ? livePin : null;
  const qrToken = liveQrToken;
  const qrValue = liveQrToken && typeof window !== "undefined" ? `${window.location.origin}/student/attendance?session=${encodeURIComponent(session.id)}&token=${encodeURIComponent(liveQrToken)}` : "";
  const remainingSeconds = Math.max(0, Math.ceil((new Date(session.expiresAt).getTime() - now) / 1000));
  const configuredSeconds = Math.max(0, Math.round((new Date(session.expiresAt).getTime() - new Date(session.startsAt).getTime()) / 1000));
  const displayedSeconds = session.status === "ACTIVE" ? remainingSeconds : configuredSeconds;
  const countdown = `${String(Math.floor(displayedSeconds / 60)).padStart(2, "0")}:${String(displayedSeconds % 60).padStart(2, "0")}`;
  const live = session.status === "ACTIVE" && remainingSeconds > 0;
  return <div className="stack"><div className="grid grid--main"><Card className="attendance-panel"><div className="attendance-panel__top"><div><h3>{session.course.code} — {session.course.title}</h3><p>Geofence radius: {session.radiusMetres} metres</p></div><span className="live-pill">{live ? "ACTIVE" : session.status === "ACTIVE" ? "EXPIRED" : session.status}</span></div><div className="session-countdown"><span>{live ? "Session ends in" : "Configured duration"}</span><strong>{countdown}</strong></div>{qrValue ? <div className="live-qr"><QRCodeSVG value={qrValue} size={210} level="H" marginSize={2} /><small>{live ? "Scan to open verified attendance" : "This QR code is no longer accepting attendance"}</small></div> : <div className="session-pin"><span>{pin ? "Session PIN" : "QR token unavailable"}</span><strong>{pin ?? "—"}</strong><small>{qrToken ? "QR session" : "Restart a QR session if this browser was refreshed"}</small></div>}</Card><Card><CardHeader title="Session controls" description={`${session.records.length} attendance submission(s)`} /><div className="session-control-actions">{live ? <>{qrValue ? <Button onClick={() => setProjecting(true)}><Maximize2 size={16} /> Project QR code</Button> : null}<Button variant="danger" onClick={() => setConfirmClose(true)}><X size={16} /> End session</Button></> : <Button disabled={restarting} onClick={() => void restart()}><RotateCcw size={16} /> {restarting ? "Restarting…" : "Restart session"}</Button>}</div></Card></div><Card className="table-shell"><div className="table-wrap"><table><thead><tr><th>Student</th><th>Marked</th><th>Method</th><th>Distance</th><th>Status</th><th>Action</th></tr></thead><tbody>{session.records.map((record) => <tr key={record.id}><td><div className="student-cell"><Avatar name={`${record.student.firstName} ${record.student.lastName}`} size="sm" /><div><strong>{record.student.firstName} {record.student.lastName}</strong><span>{record.student.studentNumber}</span></div></div></td><td>{new Date(record.markedAt).toLocaleTimeString()}</td><td>{record.method}</td><td>{record.distanceMetres == null ? "—" : `${Math.round(Number(record.distanceMetres))}m`}</td><td><Badge tone={record.status === "PRESENT" ? "success" : record.status === "LATE" ? "warning" : "danger"}>{record.status}</Badge></td><td><Button variant={record.status === "FLAGGED" ? "primary" : "secondary"} onClick={() => openReview(record)}>Review</Button></td></tr>)}</tbody></table></div></Card>{projecting && qrValue ? <div className="qr-projector" role="dialog" aria-modal="true" aria-label="Projected attendance QR code"><div className="qr-projector__controls"><div className="qr-projector__timer" data-expired={!live}><span>{live ? "Session ends in" : "Session ended"}</span><strong>{countdown}</strong></div><button type="button" onClick={() => setProjecting(false)}><X size={22} /> Close projection</button></div><div className="qr-projector__content"><span>ClassConnect Attendance</span><h2>{session.course.code}</h2><p>{session.course.title}</p><div className="qr-projector__code"><QRCodeSVG value={qrValue} size={560} level="H" marginSize={3} /></div><strong>{live ? "Scan with your phone camera" : "Attendance is closed"}</strong><small>{live ? "Sign in, allow location access, and confirm attendance before the timer reaches zero." : "The configured session duration has ended. No new submissions are accepted."}</small></div></div> : null}{reviewing ? <div className="modal-backdrop modal-backdrop--confirm" role="presentation"><section className="modal modal--confirm" role="dialog" aria-modal="true" aria-labelledby="review-attendance-title"><div className="modal__head"><div><h3 id="review-attendance-title">Review attendance</h3><p>{reviewing.student.firstName} {reviewing.student.lastName} · {reviewing.student.studentNumber}</p></div><button className="modal__close" type="button" aria-label="Close" onClick={() => setReviewing(null)}><X size={16} /></button></div><div className="modal__body"><div className="review-summary"><div><span>Current status</span><strong>{reviewing.status}</strong></div><div><span>Method</span><strong>{reviewing.method}</strong></div><div><span>Measured distance</span><strong>{reviewing.distanceMetres == null ? "Unavailable" : `${Math.round(Number(reviewing.distanceMetres))}m`}</strong></div></div>{reviewing.flaggedReason ? <div className="alert-card alert-card--warning"><span className="alert-card__icon"><AlertTriangle size={17} /></span><div><h3>Why this needs review</h3><p>{reviewing.flaggedReason}</p></div></div> : null}<div className="form-field"><label>Final attendance status</label><select value={reviewStatus} onChange={(event) => setReviewStatus(event.target.value)}><option value="PRESENT">Present</option><option value="LATE">Late</option><option value="ABSENT">Absent</option><option value="EXCUSED">Excused</option></select></div><div className="form-field"><label>Review reason</label><textarea value={reviewReason} onChange={(event) => setReviewReason(event.target.value)} placeholder="Explain the lecturer’s decision" rows={3} /></div></div><div className="modal__footer"><Button variant="secondary" onClick={() => setReviewing(null)}>Cancel</Button><Button disabled={savingReview || !reviewReason.trim()} onClick={() => void saveReview()}>{savingReview ? "Saving…" : "Save review"}</Button></div></section></div> : null}{confirmClose ? <div className="modal-backdrop modal-backdrop--confirm" role="presentation"><section className="modal modal--confirm" role="alertdialog" aria-modal="true" aria-labelledby="close-session-title"><div className="modal__head"><div><h3 id="close-session-title">End attendance session?</h3><p>Students will no longer be able to submit attendance.</p></div></div><div className="modal__body"><p>The current attendance records will be retained and the session cannot accept new submissions.</p></div><div className="modal__footer"><Button variant="secondary" onClick={() => setConfirmClose(false)}>Keep open</Button><Button variant="danger" onClick={() => void close()}>End session</Button></div></section></div> : null}</div>;
}

export function LiveGradeBook() {
  const { toast } = useToast(); const [courses, setCourses] = useState<Course[]>([]); const [courseId, setCourseId] = useState(""); const [detail, setDetail] = useState<CourseDetail | null>(null); const [assessments, setAssessments] = useState<Assessment[]>([]); const [assessmentId, setAssessmentId] = useState(""); const [marks, setMarks] = useState<Record<string, number | string>>({}); const [creating, setCreating] = useState(false); const [title, setTitle] = useState(""); const [maximumMark, setMaximumMark] = useState(""); const [weight, setWeight] = useState(""); const [type, setType] = useState("ASSIGNMENT"); const [saving, setSaving] = useState(false); const [confirmPublish, setConfirmPublish] = useState(false); const [confirmDelete, setConfirmDelete] = useState(false);
  useEffect(() => { apiRequest<Course[]>("/courses").then((items) => { setCourses(items); const query = new URLSearchParams(location.search).get("course"); setCourseId(items.some((item) => item.id === query) ? query! : items[0]?.id ?? ""); }).catch((error) => toast("Courses could not be loaded", message(error), "danger")); }, []);
  async function load(id: string) { if (!id) return; try { const [course, records] = await Promise.all([apiRequest<CourseDetail>(`/courses/${id}`), apiRequest<Assessment[]>(`/courses/${id}/grades`)]); setDetail(course); setAssessments(records); const selected = records.find((item) => item.id === assessmentId) ?? records[0]; setAssessmentId(selected?.id ?? ""); const savedMarks = new Map((selected?.grades ?? []).map((grade) => [grade.studentId, Number(grade.rawMark)])); setMarks(Object.fromEntries(course.students.map(({ student }) => [student.id, savedMarks.get(student.id) ?? 0]))); } catch (error) { toast("Grade book could not be loaded", message(error), "danger"); } }
  useEffect(() => { void load(courseId); }, [courseId]);
  function selectAssessment(id: string) { setAssessmentId(id); const selected = assessments.find((item) => item.id === id); const savedMarks = new Map((selected?.grades ?? []).map((grade) => [grade.studentId, Number(grade.rawMark)])); setMarks(Object.fromEntries((detail?.students ?? []).map(({ student }) => [student.id, savedMarks.get(student.id) ?? 0]))); }
  const usedWeight = assessments.reduce((sum, item) => sum + Number(item.weight), 0);
  const remainingWeight = Math.max(0, 100 - usedWeight);
  function openAssessmentModal() { setTitle(""); setMaximumMark(""); setWeight(""); setType("ASSIGNMENT"); setCreating(true); }
  async function createAssessment(event: FormEvent) {
    event.preventDefault();
    const parsedMaximum = Number(maximumMark);
    const parsedWeight = Number(weight);
    if (!title.trim() || !parsedMaximum || !parsedWeight) {
      toast("Complete the assessment form", "Title, maximum mark, and weight are required.", "warning");
      return;
    }
    if (parsedWeight > remainingWeight) {
      toast("Assessment weight is too high", `Only ${remainingWeight}% remains for this course.`, "danger");
      return;
    }
    const apiType = type === "MIDSEM" ? "MID_SEMESTER_EXAMINATION" : type === "EXAM" ? "EXAMINATION" : type;
    try { const created = await apiRequest<Assessment>("/assessments", { method: "POST", body: JSON.stringify({ courseId, title: title.trim(), type: apiType, maximumMark: parsedMaximum, weight: parsedWeight }) }); setCreating(false); await load(courseId); setAssessmentId(created.id); setMarks(Object.fromEntries(students.map((student) => [student.id, 0]))); toast("Assessment created", "All student marks start at 0 and can now be entered.", "success"); } catch (error) { toast("Assessment could not be created", message(error), "danger"); }
  }
  const assessment = assessments.find((item) => item.id === assessmentId); const students = detail?.students.map((item) => item.student) ?? [];
  async function save() { if (!assessment) return; setSaving(true); try { await apiRequest(`/assessments/${assessment.id}/grades/draft`, { method: "POST", body: JSON.stringify({ grades: students.map((student) => ({ studentId: student.id, rawMark: Number(marks[student.id] || 0) })) }) }); await load(courseId); toast("Draft grades saved", "Students cannot see them until publication.", "success"); } catch (error) { toast("Grades could not be saved", message(error), "danger"); } finally { setSaving(false); } }
  async function publish() { if (!assessment) return; try { await apiRequest(`/assessments/${assessment.id}/grades/publish`, { method: "POST" }); setConfirmPublish(false); await load(courseId); toast("Grades published", "Students were notified and the action was audited.", "success"); } catch (error) { toast("Grades could not be published", message(error), "danger"); } }
  async function removeAssessment() { if (!assessment) return; try { await apiRequest(`/assessments/${assessment.id}`, { method: "DELETE" }); setConfirmDelete(false); setAssessmentId(""); await load(courseId); toast("Draft assessment deleted", `${assessment.title} was removed.`, "success"); } catch (error) { toast("Assessment could not be deleted", message(error), "danger"); } }
  if (!courses.length) return <Empty>You need an assigned course before entering grades.</Empty>;
  return <div className="stack"><div className="table-toolbar"><div className="form-field"><label>Assigned course</label><select value={courseId} onChange={(event) => setCourseId(event.target.value)}>{courses.map((course) => <option value={course.id} key={course.id}>{course.code} — {course.title}</option>)}</select></div><div className="form-field"><label>Assessment</label><select value={assessmentId} onChange={(event) => selectAssessment(event.target.value)}><option value="">Select assessment</option>{assessments.map((item) => <option value={item.id} key={item.id}>{item.title} · {item.status}</option>)}</select></div><Button onClick={openAssessmentModal}>Create assessment</Button></div>{assessment ? <><div className="page-header page-header--actions"><div className="page-header__actions">{assessment.status === "DRAFT" ? <Button variant="danger" onClick={() => setConfirmDelete(true)}><Trash2 size={16} /> Delete assessment</Button> : null}<Button variant="secondary" disabled={saving || assessment.status === "PUBLISHED"} onClick={() => void save()}>{saving ? "Saving…" : "Save draft"}</Button><Button disabled={assessment.status === "PUBLISHED"} onClick={() => setConfirmPublish(true)}><Send size={16} /> Publish grades</Button></div></div><Card className="table-shell"><div className="table-wrap"><table><thead><tr><th>Student</th><th>Mark (maximum {Number(assessment.maximumMark)})</th><th>Percentage</th><th>Status</th></tr></thead><tbody>{students.map((student) => { const mark = marks[student.id] ?? 0; const numericMark = Number(mark || 0); return <tr key={student.id}><td><div className="student-cell"><Avatar name={`${student.firstName} ${student.lastName}`} size="sm" /><div><strong>{student.firstName} {student.lastName}</strong><span>{student.studentNumber}</span></div></div></td><td><input className="grade-input" disabled={assessment.status === "PUBLISHED"} type="number" min={0} max={Number(assessment.maximumMark)} value={mark} onChange={(event) => { const value = event.target.value; setMarks((current) => ({ ...current, [student.id]: value === "" ? "" : Math.min(Number(assessment.maximumMark), Math.max(0, Number(value))) })); }} /></td><td>{Math.round(numericMark / Number(assessment.maximumMark) * 100)}%</td><td><Badge tone={assessment.status === "PUBLISHED" ? "success" : "warning"}>{assessment.status}</Badge></td></tr>; })}</tbody></table></div></Card></> : <Empty>Create or select an assessment to enter marks.</Empty>}{creating ? <div className="modal-backdrop" role="presentation" onMouseDown={(event) => { if (event.target === event.currentTarget) setCreating(false); }}><form className="modal" role="dialog" aria-modal="true" aria-labelledby="create-assessment-title" onSubmit={createAssessment}><div className="modal__head"><div><h3 id="create-assessment-title">Create assessment</h3><p>{usedWeight}% already allocated · {remainingWeight}% remaining for this course.</p></div><button className="modal__close" type="button" aria-label="Close" onClick={() => setCreating(false)}><X size={17} /></button></div><div className="modal__body"><div className="form-grid"><div className="form-field"><label>Title</label><input placeholder="e.g. Quiz 1 or Mid-semester exam" value={title} onChange={(event) => setTitle(event.target.value)} required /></div><div className="form-field"><label>Type</label><select value={type} onChange={(event) => setType(event.target.value)}><option value="ASSIGNMENT">Assignment</option><option value="QUIZ">Quiz</option><option value="MIDSEM">Mid-semester</option><option value="EXAM">Examination</option><option value="PROJECT">Project</option></select></div><div className="form-field"><label>Maximum mark</label><input type="number" min={1} placeholder="e.g. 20, 50, or 100" value={maximumMark} onChange={(event) => setMaximumMark(event.target.value)} /></div><div className="form-field"><label>Weight (%)</label><input type="number" min={1} max={remainingWeight} placeholder={`Up to ${remainingWeight}%`} value={weight} onChange={(event) => setWeight(event.target.value)} /><small className={Number(weight) > remainingWeight ? "field-error" : "field-hint"}>{remainingWeight}% of the course total is available.</small></div></div></div><div className="modal__footer"><Button type="button" variant="secondary" onClick={() => setCreating(false)}>Cancel</Button><Button type="submit" disabled={!remainingWeight}>Create assessment</Button></div></form></div> : null}{confirmPublish ? <div className="modal-backdrop modal-backdrop--confirm" role="presentation"><section className="modal modal--confirm" role="alertdialog" aria-modal="true" aria-labelledby="publish-grades-title"><div className="modal__head"><div><h3 id="publish-grades-title">Publish these grades?</h3><p>Students will be notified when the grades are released.</p></div></div><div className="modal__body"><p>After publication, any correction must include a reason and will be recorded in the audit log.</p></div><div className="modal__footer"><Button variant="secondary" onClick={() => setConfirmPublish(false)}>Cancel</Button><Button onClick={() => void publish()}>Publish grades</Button></div></section></div> : null}{confirmDelete && assessment ? <div className="modal-backdrop modal-backdrop--confirm" role="presentation"><section className="modal modal--confirm" role="alertdialog" aria-modal="true" aria-labelledby="delete-assessment-title"><div className="modal__head"><div><h3 id="delete-assessment-title">Delete draft assessment?</h3><p>This action removes the draft and any saved draft marks.</p></div></div><div className="modal__body"><p>Delete <strong>{assessment.title}</strong> from <strong>{detail?.code}</strong>? Published assessments cannot be deleted.</p></div><div className="modal__footer"><Button variant="secondary" onClick={() => setConfirmDelete(false)}>Cancel</Button><Button variant="danger" onClick={() => void removeAssessment()}>Delete assessment</Button></div></section></div> : null}</div>;
}

export function LiveLecturerAnalytics() {
  const { toast } = useToast(); const [courses, setCourses] = useState<Course[]>([]); const [courseId, setCourseId] = useState(""); const [data, setData] = useState<Analytics | null>(null);
  useEffect(() => { apiRequest<Course[]>("/courses").then((items) => { setCourses(items); const query = new URLSearchParams(location.search).get("course"); setCourseId(items.some((item) => item.id === query) ? query! : items[0]?.id ?? ""); }).catch((error) => toast("Courses could not be loaded", message(error), "danger")); }, []);
  useEffect(() => { if (courseId) apiRequest<Analytics>(`/analytics/course/${courseId}`).then(setData).catch((error) => toast("Analytics could not be loaded", message(error), "danger")); }, [courseId]);
  if (!courses.length) return <Empty>No assigned course is available for analytics.</Empty>;
  const total = data?.attendance.reduce((sum, item) => sum + item._count, 0) ?? 0; const present = data?.attendance.filter((item) => ["PRESENT", "LATE"].includes(item.status)).reduce((sum, item) => sum + item._count, 0) ?? 0;
  return <div className="stack"><div className="table-toolbar"><div className="form-field"><label>Assigned course</label><select value={courseId} onChange={(event) => setCourseId(event.target.value)}>{courses.map((course) => <option value={course.id} key={course.id}>{course.code} — {course.title}</option>)}</select></div></div>{data ? <><div className="grid grid--4"><StatCard label="Students" value={data.course._count.students} icon={<UsersRound size={20} />} /><StatCard label="Class average" value={`${Number(data.grades._avg.percentage ?? 0).toFixed(1)}%`} icon={<BookOpenText size={20} />} /><StatCard label="Attendance rate" value={`${(total ? present / total * 100 : 0).toFixed(1)}%`} icon={<ClipboardCheck size={20} />} /><StatCard label="Attendance records" value={total} icon={<CheckCircle2 size={20} />} /></div><div className="grid grid--2"><Card><CardHeader title="Grade range" description="Published and corrected assessment records" /><div className="course-summary"><div><span>Minimum</span><strong>{Number(data.grades._min.percentage ?? 0).toFixed(1)}%</strong></div><div><span>Average</span><strong>{Number(data.grades._avg.percentage ?? 0).toFixed(1)}%</strong></div><div><span>Maximum</span><strong>{Number(data.grades._max.percentage ?? 0).toFixed(1)}%</strong></div></div></Card><Card><CardHeader title="Attendance distribution" description="Live records for this assigned course" />{data.attendance.map((item) => <div className="settings-row" key={item.status}><strong>{item.status.replace("_", " ")}</strong><Badge tone={item.status === "PRESENT" ? "success" : item.status === "FLAGGED" ? "danger" : "warning"}>{item._count}</Badge></div>)}</Card></div></> : <Card>Calculating course analytics…</Card>}</div>;
}

export function LiveLecturerStudents() {
  const { toast } = useToast(); const [courses, setCourses] = useState<Course[]>([]); const [courseId, setCourseId] = useState(""); const [detail, setDetail] = useState<CourseDetail | null>(null); const [query, setQuery] = useState("");
  useEffect(() => { apiRequest<Course[]>("/courses").then((items) => { setCourses(items); setCourseId(items[0]?.id ?? ""); }).catch((error) => toast("Courses could not be loaded", message(error), "danger")); }, []);
  useEffect(() => { if (courseId) apiRequest<CourseDetail>(`/courses/${courseId}`).then(setDetail).catch((error) => toast("Students could not be loaded", message(error), "danger")); }, [courseId]);
  const students = useMemo(() => (detail?.students.map((item) => item.student) ?? []).filter((student) => `${student.firstName} ${student.lastName} ${student.studentNumber}`.toLowerCase().includes(query.toLowerCase())), [detail, query]);
  if (!courses.length) return <Empty>No assigned course is available.</Empty>;
  return <Card className="table-shell"><div className="table-toolbar"><div className="form-field"><label>Assigned course</label><select value={courseId} onChange={(event) => setCourseId(event.target.value)}>{courses.map((course) => <option value={course.id} key={course.id}>{course.code} — {course.title}</option>)}</select></div><div className="form-field"><label>Search this class</label><input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Name or student ID" /></div></div><div className="table-wrap"><table><thead><tr><th>Student</th><th>Programme</th><th>Attendance</th><th>GPA</th><th>Standing</th><th>Risk</th></tr></thead><tbody>{students.map((student) => { const risk = student.riskAlerts[0]; return <tr key={student.id}><td><div className="student-cell"><Avatar name={`${student.firstName} ${student.lastName}`} size="sm" /><div><strong>{student.firstName} {student.lastName}</strong><span>{student.studentNumber}</span></div></div></td><td>{student.programme?.name ?? "—"}</td><td>{student.academicStanding ? `${Number(student.academicStanding.attendancePercentage).toFixed(1)}%` : "No data"}</td><td>{student.academicStanding ? Number(student.academicStanding.currentGpa).toFixed(2) : "No data"}</td><td>{student.academicStanding?.status?.replace("_", " ") ?? "Pending"}</td><td><Badge tone={!risk ? "success" : risk.riskLevel === "HIGH" || risk.riskLevel === "CRITICAL" ? "danger" : "warning"}>{risk?.riskLevel ?? "LOW"}</Badge></td></tr>; })}</tbody></table></div></Card>;
}

export function LiveLecturerNotifications() {
  return <NotificationCentre />;
}
