"use client";

import { useEffect, useState } from "react";
import type { FormEvent } from "react";
import Link from "next/link";
import { ArrowLeft, Eye, EyeOff, KeyRound, ShieldAlert } from "lucide-react";
import { Badge, Button, Card, CardHeader } from "@classconnect/ui";
import { ApiError, apiRequest } from "@/lib/api/client";
import { useToast } from "./toast-provider";

type Programme = { id: string; name: string; code: string };
type Structure = { departments: Array<{ programmes: Programme[] }> };
type UserDetail = {
  id: string; firstName: string; lastName: string; email: string; phone: string | null;
  role: "STUDENT" | "LECTURER" | "ADMIN"; status: "ACTIVE" | "SUSPENDED" | "DISABLED";
  studentNumber: string | null; staffNumber: string | null; mustChangePassword: boolean;
  department: { name: string; faculty: { name: string } } | null; programme: Programme | null;
  studentCourses: Array<{ course: { id: string; code: string; title: string } }>;
  lecturerCourses: Array<{ course: { id: string; code: string; title: string } }>;
};

export function UserDetailManager({ userId }: { userId: string }) {
  const { toast } = useToast();
  const [user, setUser] = useState<UserDetail | null>(null);
  const [programmes, setProgrammes] = useState<Programme[]>([]);
  const [form, setForm] = useState({ firstName: "", lastName: "", phone: "", programmeId: "" });
  const [confirmStatus, setConfirmStatus] = useState<"ACTIVE" | "SUSPENDED" | "DISABLED" | null>(null);
  const [reason, setReason] = useState("");
  const [resetOpen, setResetOpen] = useState(false);
  const [temporaryPassword, setTemporaryPassword] = useState("");
  const [showTemporaryPassword, setShowTemporaryPassword] = useState(false);

  async function load() {
    try {
      const [record, structure] = await Promise.all([
        apiRequest<UserDetail>(`/users/${userId}`),
        apiRequest<Structure[]>("/academic-structure"),
      ]);
      setUser(record);
      setProgrammes(structure[0]?.departments[0]?.programmes ?? []);
      setForm({ firstName: record.firstName, lastName: record.lastName, phone: record.phone ?? "", programmeId: record.programme?.id ?? "" });
    } catch (error) {
      toast("User could not be loaded", error instanceof ApiError ? error.message : "Please retry.", "danger");
    }
  }
  useEffect(() => { void load(); }, [userId]);

  async function save(event: FormEvent) {
    event.preventDefault();
    try {
      await apiRequest(`/users/${userId}`, { method: "PATCH", body: JSON.stringify({ ...form, phone: form.phone || undefined, programmeId: user?.role === "STUDENT" ? form.programmeId : undefined }) });
      toast("User updated", "Profile changes were saved.", "success");
      await load();
    } catch (error) { toast("Update failed", error instanceof ApiError ? error.message : "Please retry.", "danger"); }
  }

  async function changeStatus() {
    if (!confirmStatus) return;
    try {
      await apiRequest(`/users/${userId}/status`, { method: "PATCH", body: JSON.stringify({ status: confirmStatus, reason: reason || undefined }) });
      toast("Account status updated", `The account is now ${confirmStatus.toLowerCase()}.`, "success");
      setConfirmStatus(null); setReason(""); await load();
    } catch (error) { toast("Status update failed", error instanceof ApiError ? error.message : "Please retry.", "danger"); }
  }

  async function resetPassword() {
    try {
      await apiRequest(`/users/${userId}/reset-password`, { method: "POST", body: JSON.stringify({ temporaryPassword, reason: reason || "Administrator password reset" }) });
      toast("Temporary password set", "The user must change it at the next login.", "success");
      setResetOpen(false); setTemporaryPassword(""); setReason(""); await load();
    } catch (error) { toast("Password reset failed", error instanceof ApiError ? error.message : "Please retry.", "danger"); }
  }

  if (!user) return <Card>Loading user details…</Card>;
  const courses = user.role === "LECTURER" ? user.lecturerCourses : user.studentCourses;
  return <>
    <div className="detail-heading"><Link className="text-button" href="/admin/users"><ArrowLeft size={15} /> Users</Link><div><h2>{user.firstName} {user.lastName}</h2><p>{user.email}</p></div><Badge tone={user.status === "ACTIVE" ? "success" : "warning"}>{user.status}</Badge></div>
    <div className="grid grid--main"><form onSubmit={save}><Card><CardHeader title="Account details" description="Identity and academic placement" /><div className="form-grid">
      <div className="form-field"><label>First name</label><input required value={form.firstName} onChange={(e) => setForm({ ...form, firstName: e.target.value })} /></div>
      <div className="form-field"><label>Last name</label><input required value={form.lastName} onChange={(e) => setForm({ ...form, lastName: e.target.value })} /></div>
      <div className="form-field"><label>{user.role === "STUDENT" ? "Student ID" : "Staff ID"}</label><input readOnly value={user.studentNumber ?? user.staffNumber ?? ""} /></div>
      <div className="form-field"><label>Phone</label><input value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} /></div>
      <div className="form-field"><label>Faculty</label><input readOnly value={user.department?.faculty.name ?? "FAST"} /></div>
      <div className="form-field"><label>Department</label><input readOnly value={user.department?.name ?? "Computer Science"} /></div>
      {user.role === "STUDENT" ? <div className="form-field" style={{ gridColumn: "1 / -1" }}><label>Programme</label><select value={form.programmeId} onChange={(e) => setForm({ ...form, programmeId: e.target.value })}>{programmes.map((p) => <option value={p.id} key={p.id}>{p.name}</option>)}</select></div> : null}
    </div><div className="form-actions"><Button>Save Changes</Button></div></Card></form>
    <div className="stack"><Card><CardHeader title="Security & access" description="Sensitive actions require confirmation" /><div className="activity-list"><div className="activity"><span className="activity__icon"><KeyRound size={17} /></span><div><strong>Password state</strong><p>{user.mustChangePassword ? "Temporary password must be changed" : "Password changed by user"}</p></div><Button size="sm" variant="secondary" onClick={() => setResetOpen(true)}>Reset</Button></div><div className="activity"><span className="activity__icon"><ShieldAlert size={17} /></span><div><strong>Account status</strong><p>{user.status}</p></div><Button size="sm" variant={user.status === "ACTIVE" ? "danger" : "primary"} onClick={() => setConfirmStatus(user.status === "ACTIVE" ? "SUSPENDED" : "ACTIVE")}>{user.status === "ACTIVE" ? "Suspend" : "Activate"}</Button></div></div></Card>
    <Card><CardHeader title="Assigned courses" description={`${courses.length} course assignment(s)`} />{courses.length ? courses.map(({ course }) => <Link className="course-row" href={`/admin/courses/${course.id}`} key={course.id}><strong>{course.code}</strong><p>{course.title}</p></Link>) : <p className="selection-empty">No assigned courses.</p>}</Card></div></div>
    {confirmStatus ? <div className="modal-backdrop"><section className="modal modal--confirm" role="alertdialog"><div className="modal__head"><div><h3>{confirmStatus === "ACTIVE" ? "Activate Account?" : "Suspend Account?"}</h3><p>This changes the user’s system access.</p></div></div><div className="modal__body"><div className="form-field"><label>Reason</label><textarea value={reason} onChange={(e) => setReason(e.target.value)} rows={3} /></div></div><div className="modal__footer"><Button variant="secondary" onClick={() => setConfirmStatus(null)}>Cancel</Button><Button variant={confirmStatus === "ACTIVE" ? "primary" : "danger"} onClick={() => void changeStatus()}>Confirm</Button></div></section></div> : null}
    {resetOpen ? <div className="modal-backdrop"><section className="modal modal--confirm" role="alertdialog"><div className="modal__head"><div><h3>Reset Password?</h3><p>All current refresh sessions will be revoked.</p></div></div><div className="modal__body"><div className="form-field"><label>Temporary password</label><div className="password-field"><input type={showTemporaryPassword ? "text" : "password"} minLength={8} value={temporaryPassword} onChange={(e) => setTemporaryPassword(e.target.value)} /><button type="button" aria-label={showTemporaryPassword ? "Hide temporary password" : "Show temporary password"} onClick={() => setShowTemporaryPassword((value) => !value)}>{showTemporaryPassword ? <EyeOff size={17} /> : <Eye size={17} />}</button></div></div><div className="form-field"><label>Reason</label><textarea rows={2} value={reason} onChange={(e) => setReason(e.target.value)} /></div></div><div className="modal__footer"><Button variant="secondary" onClick={() => setResetOpen(false)}>Cancel</Button><Button variant="danger" disabled={temporaryPassword.length < 8} onClick={() => void resetPassword()}>Reset Password</Button></div></section></div> : null}
  </>;
}
