"use client";

import { useEffect, useMemo, useState } from "react";
import type { FormEvent } from "react";
import Link from "next/link";
import { Check, Eye, EyeOff, Plus, Search, X } from "lucide-react";
import { Avatar, Badge, Button, Card } from "@classconnect/ui";
import { ApiError, apiRequest } from "@/lib/api/client";
import { useToast } from "./toast-provider";

type Programme = { id: string; code: string; name: string; awardType: string };
type Department = { id: string; code: string; name: string; programmes: Programme[] };
type Faculty = { id: string; code: string; name: string; departments: Department[] };
type UserRecord = {
  id: string; email: string; role: "STUDENT" | "LECTURER" | "ADMIN"; status: "ACTIVE" | "SUSPENDED" | "DISABLED";
  firstName: string; lastName: string; studentNumber: string | null; staffNumber: string | null;
  mustChangePassword: boolean; department: (Department & { faculty: { id: string; code: string; name: string } }) | null;
  programme: Programme | null;
};

const emptyForm = {
  firstName: "", lastName: "", email: "", role: "STUDENT", studentNumber: "", staffNumber: "",
  phone: "", temporaryPassword: "", facultyId: "", departmentId: "", programmeId: "",
};

export function UserDirectoryManager() {
  const { toast } = useToast();
  const [users, setUsers] = useState<UserRecord[]>([]);
  const [faculties, setFaculties] = useState<Faculty[]>([]);
  const [query, setQuery] = useState("");
  const [roleFilter, setRoleFilter] = useState("");
  const [modal, setModal] = useState(false);
  const [saving, setSaving] = useState(false);
  const [showTemporaryPassword, setShowTemporaryPassword] = useState(false);
  const [form, setForm] = useState(emptyForm);

  async function load() {
    try {
      const [userData, structure] = await Promise.all([
        apiRequest<UserRecord[]>("/users"),
        apiRequest<Faculty[]>("/academic-structure"),
      ]);
      setUsers(userData);
      setFaculties(structure);
    } catch (error) {
      toast("Users could not be loaded", error instanceof ApiError ? error.message : "Please retry.", "danger");
    }
  }

  useEffect(() => { void load(); }, []);

  const departments = faculties.find((faculty) => faculty.id === form.facultyId)?.departments ?? [];
  const visibleUsers = useMemo(() => users.filter((user) => {
    const text = `${user.firstName} ${user.lastName} ${user.email} ${user.studentNumber ?? ""} ${user.staffNumber ?? ""}`.toLowerCase();
    return (!roleFilter || user.role === roleFilter) && text.includes(query.toLowerCase());
  }), [users, query, roleFilter]);

  function openModal() {
    const faculty = faculties[0];
    const department = faculty?.departments[0];
    setForm({ ...emptyForm, facultyId: faculty?.id ?? "", departmentId: department?.id ?? "", programmeId: department?.programmes[0]?.id ?? "" });
    setShowTemporaryPassword(false);
    setModal(true);
  }

  async function submit(event: FormEvent) {
    event.preventDefault();
    setSaving(true);
    try {
      await apiRequest("/users", {
        method: "POST",
        body: JSON.stringify({
          firstName: form.firstName, lastName: form.lastName, email: form.email, role: form.role,
          temporaryPassword: form.temporaryPassword, departmentId: form.departmentId,
          programmeId: form.role === "STUDENT" ? form.programmeId : undefined,
          studentNumber: form.role === "STUDENT" ? form.studentNumber : undefined,
          staffNumber: form.role !== "STUDENT" ? form.staffNumber : undefined,
          phone: form.phone || undefined,
        }),
      });
      toast("User account created", "The user must replace the temporary password at first login.", "success");
      setModal(false);
      await load();
    } catch (error) {
      toast("Account could not be created", error instanceof ApiError ? error.message : "Please check the form.", "danger");
    } finally {
      setSaving(false);
    }
  }

  return (
    <>
      <div style={{ display: "flex", justifyContent: "flex-end", marginBottom: 16 }}><Button onClick={openModal}><Plus size={16} /> Add User</Button></div>
      <Card className="table-shell">
        <div className="directory-toolbar">
          <div style={{ position: "relative", flex: 2 }}><Search size={16} style={{ position: "absolute", left: 12, top: 13, color: "var(--muted)" }} /><input className="input" style={{ paddingLeft: 36 }} placeholder="Search name, email, or ID" value={query} onChange={(event) => setQuery(event.target.value)} /></div>
          <select className="select" value={roleFilter} onChange={(event) => setRoleFilter(event.target.value)}><option value="">All roles</option><option value="STUDENT">Student</option><option value="LECTURER">Lecturer</option><option value="ADMIN">Administrator</option></select>
        </div>
        <div className="table-wrap"><table><thead><tr><th>User</th><th>Role</th><th>Programme</th><th>Department</th><th>Status</th><th>Password</th><th></th></tr></thead><tbody>
          {visibleUsers.map((user) => <tr key={user.id}>
            <td><div className="student-cell"><Avatar name={`${user.firstName} ${user.lastName}`} size="sm" /><div><strong>{user.firstName} {user.lastName}</strong><span>{user.studentNumber ?? user.staffNumber ?? user.email}</span></div></div></td>
            <td>{user.role === "ADMIN" ? "Administrator" : user.role[0] + user.role.slice(1).toLowerCase()}</td>
            <td>{user.programme?.name ?? "Not applicable"}</td>
            <td>{user.department?.name ?? "Not assigned"}</td>
            <td><Badge tone={user.status === "ACTIVE" ? "success" : user.status === "SUSPENDED" ? "warning" : "danger"}>{user.status}</Badge></td>
            <td><Badge tone={user.mustChangePassword ? "warning" : "success"}>{user.mustChangePassword ? "Temporary" : "Changed"}</Badge></td>
            <td><Link className="ui-button ui-button--secondary ui-button--sm" href={`/admin/users/${user.id}`}>Manage</Link></td>
          </tr>)}
        </tbody></table></div>
      </Card>

      {modal ? <div className="modal-backdrop" role="presentation" onMouseDown={(event) => { if (event.target === event.currentTarget && !saving) setModal(false); }}>
        <form className="modal modal--wide" role="dialog" aria-modal="true" aria-labelledby="create-user-title" onSubmit={submit}>
          <div className="modal__head"><div><h3 id="create-user-title">Create User Account</h3><p>The user will change the temporary password at first login.</p></div><button className="modal__close" type="button" aria-label="Close" onClick={() => setModal(false)}><X size={16} /></button></div>
          <div className="modal__body"><div className="form-grid">
            <div className="form-field"><label>First name</label><input required value={form.firstName} onChange={(event) => setForm({ ...form, firstName: event.target.value })} /></div>
            <div className="form-field"><label>Last name</label><input required value={form.lastName} onChange={(event) => setForm({ ...form, lastName: event.target.value })} /></div>
            <div className="form-field"><label>Institutional email</label><input required type="email" value={form.email} onChange={(event) => setForm({ ...form, email: event.target.value })} /></div>
            <div className="form-field"><label>Role</label><select value={form.role} onChange={(event) => setForm({ ...form, role: event.target.value })}><option value="STUDENT">Student</option><option value="LECTURER">Lecturer</option><option value="ADMIN">Administrator</option></select></div>
            <div className="form-field"><label>{form.role === "STUDENT" ? "Student ID" : "Staff ID"}</label><input required value={form.role === "STUDENT" ? form.studentNumber : form.staffNumber} onChange={(event) => setForm(form.role === "STUDENT" ? { ...form, studentNumber: event.target.value } : { ...form, staffNumber: event.target.value })} /></div>
            <div className="form-field"><label>Phone (optional)</label><input value={form.phone} onChange={(event) => setForm({ ...form, phone: event.target.value })} /></div>
            <div className="form-field"><label>Faculty</label><input readOnly value={faculties[0]?.name ?? "Faculty of Applied Sciences and Technology"} /></div>
            <div className="form-field"><label>Department</label><input readOnly value={departments[0]?.name ?? "Computer Science"} /></div>
            {form.role === "STUDENT" ? <div className="form-field" style={{ gridColumn: "1 / -1" }}><label>Programme</label><select required value={form.programmeId} onChange={(event) => setForm({ ...form, programmeId: event.target.value })}>{departments[0]?.programmes.map((programme) => <option key={programme.id} value={programme.id}>{programme.name}</option>)}</select></div> : null}
            <div className="form-field" style={{ gridColumn: "1 / -1" }}><label>Temporary password</label><div className="password-field"><input required type={showTemporaryPassword ? "text" : "password"} minLength={8} autoComplete="new-password" value={form.temporaryPassword} onChange={(event) => setForm({ ...form, temporaryPassword: event.target.value })} /><button type="button" aria-label={showTemporaryPassword ? "Hide temporary password" : "Show temporary password"} title={showTemporaryPassword ? "Hide temporary password" : "Show temporary password"} onClick={() => setShowTemporaryPassword((visible) => !visible)}>{showTemporaryPassword ? <EyeOff size={18} /> : <Eye size={18} />}</button></div><small>The account will be blocked from the portal until this password is changed.</small></div>
          </div></div>
          <div className="modal__footer"><Button type="button" variant="secondary" disabled={saving} onClick={() => setModal(false)}>Cancel</Button><Button type="submit" disabled={saving}><Check size={16} /> {saving ? "Creating…" : "Create Account"}</Button></div>
        </form>
      </div> : null}
    </>
  );
}
