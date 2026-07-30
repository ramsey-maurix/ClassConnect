"use client";

import { useEffect, useMemo, useState } from "react";
import type { FormEvent } from "react";
import { BookCopy, CheckCircle2, UserRoundPlus, UsersRound, X } from "lucide-react";
import { Avatar, Badge, Button, Card, StatCard } from "@classconnect/ui";
import { ApiError, apiRequest } from "@/lib/api/client";
import { PageHeader } from "./display";
import { useToast } from "./toast-provider";
import { PaginatedTable } from "./paginated-table";

type Student = { id: string; firstName: string; lastName: string; email: string; studentNumber: string | null; status: "ACTIVE" | "SUSPENDED" | "DISABLED" };
type ClassAssignment = {
  id: string;
  status: "ACTIVE" | "INACTIVE";
  course: { id: string; code: string; title: string };
  period: { academicYear: string; semester: "SEMESTER_1" | "SEMESTER_2" };
  lecturer: { id: string; firstName: string; lastName: string; staffNumber: string | null } | null;
  students: Array<{ id: string; createdAt: string; student: Student }>;
};

function periodLabel(item: ClassAssignment) {
  return `${item.period.academicYear} · ${item.period.semester === "SEMESTER_1" ? "Semester 1" : "Semester 2"}`;
}

export function ClassAssignmentsManager() {
  const { toast } = useToast();
  const [classes, setClasses] = useState<ClassAssignment[]>([]);
  const [students, setStudents] = useState<Student[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [modalOpen, setModalOpen] = useState(false);
  const [manageOpen, setManageOpen] = useState(false);
  const [classId, setClassId] = useState("");
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [search, setSearch] = useState("");
  const [confirmStudent, setConfirmStudent] = useState<Student | null>(null);

  async function load() {
    setLoading(true);
    try {
      const [classData, studentData] = await Promise.all([
        apiRequest<ClassAssignment[]>("/class-assignments/classes"),
        apiRequest<Student[]>("/users?role=STUDENT"),
      ]);
      setClasses(classData);
      setStudents(studentData);
      if (!classId && classData[0]) setClassId(classData[0].id);
    } catch (error) {
      toast("Class assignments could not be loaded", error instanceof ApiError ? error.message : "Please retry.", "danger");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { void load(); }, []);

  const selectedClass = classes.find((item) => item.id === classId) ?? null;
  const assignedIds = new Set(selectedClass?.students.map((item) => item.student.id) ?? []);
  const availableStudents = useMemo(() => {
    const normalized = search.trim().toLowerCase();
    return students.filter((student) => (
      !assignedIds.has(student.id) &&
      student.status === "ACTIVE" &&
      (!normalized || `${student.firstName} ${student.lastName} ${student.email} ${student.studentNumber ?? ""}`.toLowerCase().includes(normalized))
    ));
  }, [students, selectedClass, search]);
  const assignedTotal = classes.reduce((total, item) => total + item.students.length, 0);
  const emptyClasses = classes.filter((item) => item.students.length === 0).length;

  function openAdd(targetClassId?: string) {
    setClassId(targetClassId ?? classes[0]?.id ?? "");
    setSelectedIds([]);
    setSearch("");
    setModalOpen(true);
  }

  async function assign(event: FormEvent) {
    event.preventDefault();
    if (!classId || !selectedIds.length) return;
    setSaving(true);
    try {
      await apiRequest(`/class-assignments/classes/${classId}/students`, {
        method: "POST",
        body: JSON.stringify({ studentIds: selectedIds }),
      });
      toast("Students added", `${selectedIds.length} student account(s) were assigned to the class.`, "success");
      setModalOpen(false);
      await load();
    } catch (error) {
      toast("Students could not be added", error instanceof ApiError ? error.message : "Please retry.", "danger");
    } finally {
      setSaving(false);
    }
  }

  async function removeStudent(student: Student) {
    if (!selectedClass) return;
    try {
      await apiRequest(`/class-assignments/classes/${selectedClass.id}/students/${student.id}`, { method: "DELETE" });
      toast("Student removed", `${student.firstName} ${student.lastName} was removed from this class.`, "success");
      await load();
    } catch (error) {
      toast("Student could not be removed", error instanceof ApiError ? error.message : "Please retry.", "danger");
    }
  }

  return (
    <>
      <PageHeader title="Class Assignments" description="Add existing student accounts to their semester classes." actions={<Button onClick={() => openAdd()} disabled={!classes.length}><UserRoundPlus size={16} /> Add Students</Button>} />
      <div className="grid grid--4" style={{ marginBottom: 17 }}>
        <StatCard label="Semester classes" value={classes.length} icon={<BookCopy size={20} />} trend="Available" />
        <StatCard label="Student assignments" value={assignedTotal} icon={<UsersRound size={20} />} trend="Across classes" />
        <StatCard label="Classes with students" value={classes.length - emptyClasses} icon={<CheckCircle2 size={20} />} trend="Active" />
        <StatCard label="Classes without students" value={emptyClasses} icon={<UserRoundPlus size={20} />} trend={emptyClasses ? "Needs action" : "Complete"} trendTone={emptyClasses ? "warning" : "success"} />
      </div>
      <Card className="table-shell">
        <PaginatedTable><table>
          <thead><tr><th>Class</th><th>Academic period</th><th>Lecturer</th><th>Students</th><th>Status</th><th></th></tr></thead>
          <tbody>{loading ? <tr><td colSpan={6}>Loading classes…</td></tr> : classes.length ? classes.map((item) => (
            <tr key={item.id}>
              <td><strong>{item.course.code}</strong><br /><span style={{ color: "var(--muted)" }}>{item.course.title}</span></td>
              <td>{periodLabel(item)}</td>
              <td>{item.lecturer ? `${item.lecturer.firstName} ${item.lecturer.lastName}` : "Unassigned"}</td>
              <td>{item.students.length}</td>
              <td><Badge tone={item.status === "ACTIVE" ? "success" : "neutral"}>{item.status}</Badge></td>
              <td><div style={{ display: "flex", gap: 7 }}><Button size="sm" onClick={() => openAdd(item.id)}>Add</Button><Button size="sm" variant="secondary" onClick={() => { setClassId(item.id); setManageOpen(true); }}>Manage</Button></div></td>
            </tr>
          )) : <tr><td colSpan={6}>Create a semester course before assigning students.</td></tr>}</tbody>
        </table></PaginatedTable>
      </Card>

      {modalOpen ? <div className="modal-backdrop" role="presentation" onMouseDown={(event) => { if (event.target === event.currentTarget && !saving) setModalOpen(false); }}>
        <form className="modal" role="dialog" aria-modal="true" aria-labelledby="assign-students-title" onSubmit={assign}>
          <div className="modal__head"><div><h3 id="assign-students-title">Add Students to Class</h3><p>Select existing student accounts. This is not admission or registration.</p></div><button className="modal__close" type="button" aria-label="Close" onClick={() => setModalOpen(false)}><X size={17} /></button></div>
          <div className="modal__body"><div className="form-field"><label htmlFor="assignment-class">Class</label><select id="assignment-class" required value={classId} onChange={(event) => { setClassId(event.target.value); setSelectedIds([]); }}>{classes.map((item) => <option key={item.id} value={item.id}>{item.course.code} · {periodLabel(item)}</option>)}</select></div>
          <div className="form-field"><label htmlFor="student-search">Find students</label><input id="student-search" value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Name, email, or student ID" /></div>
          <div className="selection-list">{availableStudents.length ? availableStudents.map((student) => {
            const checked = selectedIds.includes(student.id);
            return <label className="selection-row" key={student.id}><input type="checkbox" checked={checked} onChange={() => setSelectedIds((current) => checked ? current.filter((id) => id !== student.id) : [...current, student.id])} /><Avatar name={`${student.firstName} ${student.lastName}`} size="sm" /><span><strong>{student.firstName} {student.lastName}</strong><small>{student.studentNumber} · {student.email}</small></span></label>;
          }) : <p className="selection-empty">No unassigned students match your search.</p>}</div></div>
          <div className="modal__footer"><span style={{ marginRight: "auto", color: "var(--muted)", fontSize: ".7rem" }}>{selectedIds.length} selected</span><Button type="button" variant="secondary" disabled={saving} onClick={() => setModalOpen(false)}>Cancel</Button><Button type="submit" disabled={saving || !selectedIds.length}>{saving ? "Adding…" : "Add Students"}</Button></div>
        </form>
      </div> : null}

      {manageOpen && selectedClass ? <div className="modal-backdrop" role="presentation" onMouseDown={(event) => { if (event.target === event.currentTarget) setManageOpen(false); }}>
        <section className="modal" role="dialog" aria-modal="true" aria-labelledby="manage-class-title">
          <div className="modal__head"><div><h3 id="manage-class-title">{selectedClass.course.code} Students</h3><p>{periodLabel(selectedClass)} · {selectedClass.students.length} assigned</p></div><button className="modal__close" type="button" aria-label="Close" onClick={() => setManageOpen(false)}><X size={17} /></button></div>
          <div className="modal__body"><div className="selection-list">{selectedClass.students.length ? selectedClass.students.map(({ student }) => <div className="selection-row selection-row--managed" key={student.id}><Avatar name={`${student.firstName} ${student.lastName}`} size="sm" /><span><strong>{student.firstName} {student.lastName}</strong><small>{student.studentNumber} · {student.email}</small></span><Button size="sm" variant="danger" onClick={() => setConfirmStudent(student)}>Remove</Button></div>) : <p className="selection-empty">No students have been added to this class.</p>}</div></div>
          <div className="modal__footer"><Button variant="secondary" onClick={() => setManageOpen(false)}>Close</Button><Button onClick={() => { setManageOpen(false); openAdd(selectedClass.id); }}><UserRoundPlus size={15} /> Add More</Button></div>
        </section>
      </div> : null}

      {confirmStudent && selectedClass ? <div className="modal-backdrop modal-backdrop--confirm" role="presentation">
        <section className="modal modal--confirm" role="alertdialog" aria-modal="true" aria-labelledby="remove-student-title">
          <div className="modal__head"><div><h3 id="remove-student-title">Remove Student?</h3><p>This changes access to the selected semester class.</p></div></div>
          <div className="modal__body"><p>Remove <strong>{confirmStudent.firstName} {confirmStudent.lastName}</strong> ({confirmStudent.studentNumber}) from <strong>{selectedClass.course.code}</strong>?</p></div>
          <div className="modal__footer"><Button variant="secondary" onClick={() => setConfirmStudent(null)}>Cancel</Button><Button variant="danger" onClick={() => { const student = confirmStudent; setConfirmStudent(null); void removeStudent(student); }}>Remove Student</Button></div>
        </section>
      </div> : null}
    </>
  );
}
