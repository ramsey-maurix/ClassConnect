"use client";

import { useEffect, useRef, useState } from "react";
import { Badge, Button, Card, CardHeader } from "@classconnect/ui";
import { Camera, CheckCircle2, MapPin, QrCode, ShieldCheck, Smartphone, X } from "lucide-react";
import { attendanceApi } from "@/lib/api/endpoints";
import { ApiError } from "@/lib/api/client";
import { getBestGeolocation } from "@/lib/geolocation";
import { useToast } from "./toast-provider";

type ActiveSession = {
  id: string;
  method: "PIN" | "QR";
  radiusMetres: number;
  startsAt: string;
  expiresAt: string;
  lateAfterMinutes: number;
  course: { code: string; title: string };
  records: Array<{ id: string; status: string; method: string; markedAt: string; distanceMetres: number | string | null }>;
};

function attendanceError(error: unknown) {
  const message =
    error instanceof ApiError ? error.message : "Attendance could not be verified.";
  if (/invalid pin/i.test(message)) return "The PIN is incorrect. Check the four digits displayed by your lecturer and try again.";
  if (/invalid qr|expired/i.test(message)) return "This QR code has expired. Scan the newest QR code currently displayed by your lecturer.";
  if (/already marked/i.test(message)) return "Your attendance has already been recorded for this session.";
  if (/accuracy|precise location/i.test(message)) return "Your GPS reading is not accurate enough. Enable precise location, move near a window if necessary, and try again.";
  if (/distance|radius|outside/i.test(message)) return "Your device appears to be outside the classroom attendance area. Move inside the classroom and retry with precise location enabled.";
  if (/mobile phone/i.test(message)) return "QR attendance must be completed on your phone. Open ClassConnect on the phone and scan again.";
  return message;
}

export function AttendanceCheckIn() {
  const { toast } = useToast();
  const [digits, setDigits] = useState(["", "", "", ""]);
  const inputs = useRef<Array<HTMLInputElement | null>>([]);
  const [sessions, setSessions] = useState<ActiveSession[]>([]);
  const [sessionId, setSessionId] = useState("");
  const [qrToken, setQrToken] = useState("");
  const [isMobileDevice, setIsMobileDevice] = useState<boolean | null>(null);
  const [markedSessions, setMarkedSessions] = useState<Record<string, ActiveSession["records"][number]>>({});
  const [scanning, setScanning] = useState(false);
  const [scanError, setScanError] = useState("");
  const video = useRef<HTMLVideoElement | null>(null);
  const scanner = useRef<{ stop: () => void } | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [now, setNow] = useState(() => Date.now());

  useEffect(() => {
    const timer = window.setInterval(() => setNow(Date.now()), 1000);
    return () => window.clearInterval(timer);
  }, []);

  useEffect(() => {
    setIsMobileDevice(/Android|iPhone|iPad|iPod|Mobile/i.test(navigator.userAgent));
    const params = new URLSearchParams(window.location.search);
    const scannedSession = params.get("session") ?? "";
    setQrToken(params.get("token") ?? "");
    attendanceApi.activeSessions()
      .then((items) => {
        const active = items as ActiveSession[];
        setSessions(active);
        setMarkedSessions(Object.fromEntries(active.flatMap((item) => item.records[0] ? [[item.id, item.records[0]]] : [])));
        setSessionId(active.some((item) => item.id === scannedSession) ? scannedSession : active[0]?.id ?? "");
      })
      .catch((error) => toast("Active sessions could not be loaded", error instanceof ApiError ? error.message : "Please retry.", "danger"));
  }, []);

  useEffect(() => () => scanner.current?.stop(), []);

  function stopScanner() {
    scanner.current?.stop();
    scanner.current = null;
    setScanning(false);
  }

  async function startScanner() {
    setScanError("");
    setScanning(true);
    try {
      const { BrowserQRCodeReader } = await import("@zxing/browser");
      const reader = new BrowserQRCodeReader();
      const controls = await reader.decodeFromConstraints(
        { audio: false, video: { facingMode: { ideal: "environment" } } },
        video.current!,
        (result) => {
          if (!result) return;
          try {
            const scanned = new URL(result.getText(), window.location.origin);
            const scannedSession = scanned.searchParams.get("session");
            const token = scanned.searchParams.get("token");
            const active = sessions.find((item) => item.id === scannedSession && item.method === "QR");
            if (!active || !token) throw new Error("This is not an active ClassConnect attendance QR code.");
            setSessionId(active.id);
            setQrToken(token);
            stopScanner();
            toast("QR code accepted", `${active.course.code} is ready for location verification.`, "success");
          } catch (error) {
            setScanError(error instanceof Error ? error.message : "This QR code is not valid.");
          }
        },
      );
      scanner.current = controls;
    } catch {
      setScanning(false);
      setScanError("Camera access could not be started. Allow camera permission in your browser settings and retry.");
    }
  }

  function update(index: number, value: string) {
    const digit = value.replace(/\D/g, "").slice(-1);
    setDigits((current) => current.map((item, itemIndex) => itemIndex === index ? digit : item));
    if (digit) inputs.current[index + 1]?.focus();
  }

  async function submit() {
    const pin = digits.join("");
    if (!sessionId) {
      toast("No active session", "Ask your lecturer to start an attendance session.", "warning");
      return;
    }
    if (!qrToken && pin.length !== 4) {
      toast("Enter the complete PIN", "All four numbers are required.", "warning");
      return;
    }
    setSubmitting(true);
    try {
      const position = await getBestGeolocation();
      const record = await attendanceApi.mark({
        sessionId,
        ...(qrToken ? { qrToken } : { pin }),
        latitude: position.coords.latitude,
        longitude: position.coords.longitude,
        accuracy: position.coords.accuracy,
      }) as ActiveSession["records"][number];
      setMarkedSessions((current) => ({ ...current, [sessionId]: record }));
      setDigits(["", "", "", ""]);
      setQrToken("");
      window.history.replaceState({}, "", "/student/attendance");
      toast("Attendance marked", `${sessions.find((item) => item.id === sessionId)?.course.code ?? "Class"} · GPS and session checks passed.`, "success");
    } catch (error) {
      toast(
        "Attendance not verified",
        attendanceError(error),
        "danger",
      );
    } finally {
      setSubmitting(false);
    }
  }

  const selected = sessions.find((item) => item.id === sessionId);
  const usesQr = selected?.method === "QR";
  const qrLockedOnLaptop = usesQr && isMobileDevice === false;
  const marked = markedSessions[sessionId];
  const lateAt = selected
    ? new Date(selected.startsAt).getTime() + selected.lateAfterMinutes * 60_000
    : 0;
  const expiresAt = selected ? new Date(selected.expiresAt).getTime() : 0;
  const remainingSeconds = selected
    ? Math.max(0, Math.ceil((expiresAt - now) / 1000))
    : 0;
  const phase = !selected
    ? "WAITING"
    : now >= expiresAt
      ? "CLOSED"
      : now >= lateAt
        ? "LATE"
        : "PRESENT";
  const countdown = `${String(Math.floor(remainingSeconds / 60)).padStart(2, "0")}:${String(remainingSeconds % 60).padStart(2, "0")}`;

  return (
    <div className="grid grid--main">
      <Card>
        <CardHeader title="Active class session" description={selected ? `${selected.course.code} — ${selected.course.title}` : "No active session available"} action={selected ? <Badge tone="success">● Live now</Badge> : <Badge tone="neutral">Waiting</Badge>} />
        {selected ? <div className="attendance-phase" data-phase={phase} aria-live="polite"><div><span>{phase === "PRESENT" ? "Present period" : phase === "LATE" ? "Late period" : "Session closed"}</span><strong>{countdown}</strong></div><p>{phase === "PRESENT" ? `Check in before ${new Date(lateAt).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })} to be marked present.` : phase === "LATE" ? "You can still check in, but your attendance will be recorded as late." : "This attendance session is no longer accepting submissions."}</p></div> : null}
        {sessions.length > 1 ? <div className="form-field"><label>Course session</label><select value={sessionId} onChange={(event) => { setSessionId(event.target.value); setQrToken(""); stopScanner(); }}>{sessions.map((session) => <option value={session.id} key={session.id}>{session.course.code} — {session.course.title} ({session.method})</option>)}</select></div> : null}
        <div className="gps-status"><div className="gps-radar"><span /></div><div><h4>Location checked on submission</h4><p>Your device must be inside the lecturer’s {selected?.radiusMetres ?? "configured"}-metre classroom geofence.</p></div></div>
        <div style={{ marginTop: 22, textAlign: "center" }}>
          {marked ? <div className="attendance-success" role="status" aria-live="polite"><CheckCircle2 size={30} /><div><strong>Attendance marked: {marked.status}</strong><span>{selected?.course.code} · {marked.method} · {new Date(marked.markedAt).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}{marked.distanceMetres == null ? "" : ` · ${Math.round(Number(marked.distanceMetres))}m from classroom centre`}</span></div></div> : <>
          <p style={{ color: "var(--muted)", fontSize: ".7rem" }}>{qrLockedOnLaptop ? "This QR attendance session must be completed on a mobile phone." : qrToken ? "QR code accepted. Confirm below to verify your location and mark attendance." : usesQr ? "Scan the lecturer’s QR code using the camera inside ClassConnect." : "Enter the four-digit session PIN displayed by the lecturer."}</p>
          {qrLockedOnLaptop && !marked ? <div className="qr-phone-required"><Smartphone size={34} /><div><strong>Continue on your phone</strong><span>This class is using QR attendance. Open ClassConnect on your phone, go to Attendance, and scan the QR code displayed by your lecturer.</span><small>PIN attendance sessions can still be completed on this laptop.</small></div></div> : usesQr && !qrToken ? <div className="in-app-scanner">
            {scanning ? <div className="in-app-scanner__viewport"><video ref={video} muted playsInline /><span className="in-app-scanner__frame" /><button type="button" aria-label="Close scanner" onClick={stopScanner}><X size={18} /></button></div> : <div className="in-app-scanner__prompt"><QrCode size={38} /><strong>Scan attendance QR</strong><span>The camera opens here without leaving the student portal.</span><Button onClick={() => void startScanner()}><Camera size={16} /> Open scanner</Button></div>}
            {scanError ? <p className="in-app-scanner__error" role="alert" aria-live="assertive">{scanError}</p> : null}
          </div> : !qrToken ? <div className="pin-entry">{digits.map((digit, index) => (
            <input
              aria-label={`PIN digit ${index + 1}`}
              inputMode="numeric"
              key={index}
              maxLength={1}
              ref={(node) => { inputs.current[index] = node; }}
              value={digit}
              onChange={(event) => update(index, event.target.value)}
              onKeyDown={(event) => { if (event.key === "Backspace" && !digit) inputs.current[index - 1]?.focus(); }}
            />
          ))}</div> : <div className="scanned-qr-status"><QrCode size={22} /><span>Secure session QR scanned</span></div>}
          <Button disabled={submitting || !sessionId || phase === "CLOSED" || qrLockedOnLaptop || (usesQr && !qrToken)} onClick={submit}><ShieldCheck size={16} /> {qrLockedOnLaptop ? "Continue on your phone" : submitting ? "Verifying…" : phase === "CLOSED" ? "Session closed" : "Verify and mark attendance"}</Button>
          </>}
        </div>
      </Card>
      <div className="stack">
        <Card>
          <CardHeader title="Session details" description="Confirm the current class before submitting" />
          <div className="course-row">
            <div className="course-row__code">{selected?.course.code ?? "—"}</div>
            <div><h4>{selected?.course.title ?? "No active class"}</h4><p>Verified attendance session</p></div>
            <Badge tone="info">{selected ? new Date(selected.expiresAt).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }) : "—"}</Badge>
          </div>
          <div style={{ marginTop: 14 }} className="activity-list">
            <div className="activity"><span className="activity__icon"><MapPin size={17} /></span><div><strong>GPS radius</strong><p>{selected?.radiusMetres ?? "—"} metres from the classroom centre</p></div><time>Required</time></div>
            <div className="activity"><span className="activity__icon"><ShieldCheck size={17} /></span><div><strong>Session verification</strong><p>{qrToken ? "Secure QR token supplied" : usesQr ? "QR scan required" : "PIN required"}</p></div><time>{qrToken ? "Ready" : "Pending"}</time></div>
          </div>
        </Card>
        <div className="alert-card alert-card--warning"><span className="alert-card__icon"><MapPin size={17} /></span><div><h3>Location protection is active</h3><p>Submissions outside the geofence or from mock-location tools will be rejected and flagged.</p></div></div>
      </div>
    </div>
  );
}
