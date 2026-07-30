"use client";

import { useEffect, useMemo, useState } from "react";
import type { FormEvent } from "react";
import Link from "next/link";
import { BookCopy, CalendarRange, UserRoundPlus, UsersRound, X } from "lucide-react";
import { Badge, Button, Card, StatCard } from "@classconnect/ui";
import { apiRequest, ApiError } from "@/lib/api/client";
import { useToast } from "./toast-provider";
import { PageHeader } from "./display";
import { PaginatedTable } from "./paginated-table";

type Lecturer = {
  id: string;
  firstName: string;
  lastName: string;
  staffNumber: string | null;
};
type Programme = { id: string; code: string; name: string; awardType: string };
type Department = { id: string; code: string; name: string; programmes: Programme[] };
type Faculty = { id: string; code: string; name: string; departments: Department[] };

type Offering = {
  id: string;
  status: "ACTIVE" | "INACTIVE";
  period: { academicYear: string; semester: "SEMESTER_1" | "SEMESTER_2" };
  lecturer: Lecturer | null;
};

type CourseRecord = {
  id: string;
  code: string;
  title: string;
  description: string | null;
  creditHours: number;
  status: "ACTIVE" | "INACTIVE";
  offerings: Offering[];
  _count: { students: number; lecturers: number };
};

const initialForm = {
  code: "",
  title: "",
  description: "",
  creditHours: "",
  academicYear: "",
  semester: "SEMESTER_1",
  lecturerId: "",
  status: "ACTIVE",
  facultyId: "",
  departmentId: "",
  programmeIds: [] as string[],
};

export function AdminCoursesManager() {
  const { toast } = useToast();
  const [courses, setCourses] = useState<CourseRecord[]>([]);
  const [lecturers, setLecturers] = useState<Lecturer[]>([]);
  const [faculties, setFaculties] = useState<Faculty[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [modalOpen, setModalOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [semester, setSemester] = useState("");
  const [form, setForm] = useState(initialForm);

  async function load() {
    setLoading(true);
    try {
      const [courseData, lecturerData, structure] = await Promise.all([
        apiRequest<CourseRecord[]>("/courses"),
        apiRequest<Lecturer[]>("/users?role=LECTURER"),
        apiRequest<Faculty[]>("/academic-structure"),
      ]);
      setCourses(courseData);
      setLecturers(lecturerData);
      setFaculties(structure);
    } catch (error) {
      toast("Courses could not be loaded", error instanceof ApiError ? error.message : "Please retry.", "danger");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void load();
  }, []);

  const visibleCourses = useMemo(() => {
    const normalized = query.trim().toLowerCase();
    return courses.filter((course) => {
      const matchesText = !normalized || `${course.code} ${course.title}`.toLowerCase().includes(normalized);
      const matchesSemester = !semester || course.offerings.some((offering) => offering.period.semester === semester);
      return matchesText && matchesSemester;
    });
  }, [courses, query, semester]);

  const offerings = courses.flatMap((course) => course.offerings);
  const departments = faculties.find((faculty) => faculty.id === form.facultyId)?.departments ?? [];
  const assigned = offerings.filter((offering) => offering.lecturer).length;
  const seats = courses.reduce((total, course) => total + course._count.students, 0);

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSaving(true);
    try {
      await apiRequest("/courses", {
        method: "POST",
        body: JSON.stringify({
          code: form.code.trim(),
          title: form.title.trim(),
          description: form.description.trim() || undefined,
          creditHours: Number(form.creditHours),
          academicYear: form.academicYear,
          semester: form.semester,
          status: form.status,
          lecturerId: form.lecturerId || undefined,
          departmentId: form.departmentId,
          programmeIds: form.programmeIds,
        }),
      });
      toast("Course created", `${form.code.toUpperCase()} was created for ${form.academicYear}.`, "success");
      setModalOpen(false);
      const faculty = faculties[0];
      const department = faculty?.departments[0];
      setForm({ ...initialForm, facultyId: faculty?.id ?? "", departmentId: department?.id ?? "", programmeIds: department?.programmes.map((programme) => programme.id) ?? [] });
      await load();
    } catch (error) {
      toast("Course could not be created", error instanceof ApiError ? error.message : "Please check the form and retry.", "danger");
    } finally {
      setSaving(false);
    }
  }

  return (
    <>
      <PageHeader
        title="Courses"
        description="Create semester classes, assign lecturers, and add existing students."
        actions={<Button onClick={() => { const faculty = faculties[0]; const department = faculty?.departments[0]; setForm({ ...initialForm, facultyId: faculty?.id ?? "", departmentId: department?.id ?? "", programmeIds: department?.programmes.map((programme) => programme.id) ?? [] }); setModalOpen(true); }}><BookCopy size={16} /> Add Course</Button>}
      />

      <div className="grid grid--4" style={{ marginBottom: 17 }}>
        <StatCard label="Courses" value={courses.length} icon={<BookCopy size={20} />} trend="Catalogue" />
        <StatCard label="Semester classes" value={offerings.length} icon={<CalendarRange size={20} />} trend="All periods" />
        <StatCard label="Assigned lecturers" value={assigned} icon={<UsersRound size={20} />} trend={`${offerings.length - assigned} unassigned`} trendTone={offerings.length === assigned ? "success" : "warning"} />
        <StatCard label="Student assignments" value={seats} icon={<UserRoundPlus size={20} />} trend="Across courses" />
      </div>

      <Card className="table-shell">
        <div className="table-toolbar">
          <div className="form-field">
            <label htmlFor="course-search">Search course</label>
            <input id="course-search" value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Code or course title" />
          </div>
          <div className="form-field">
            <label htmlFor="semester-filter">Semester</label>
            <select id="semester-filter" value={semester} onChange={(event) => setSemester(event.target.value)}>
              <option value="">All semesters</option>
              <option value="SEMESTER_1">Semester 1</option>
              <option value="SEMESTER_2">Semester 2</option>
            </select>
          </div>
          <Button variant="secondary" onClick={() => { setQuery(""); setSemester(""); }}>Clear filters</Button>
        </div>
        <PaginatedTable><table>
            <thead><tr><th>Course</th><th>Credits</th><th>Academic period</th><th>Lecturer</th><th>Students</th><th>Status</th><th></th></tr></thead>
            <tbody>
              {loading ? (
                <tr><td colSpan={6}>Loading courses…</td></tr>
              ) : visibleCourses.length ? visibleCourses.map((course) => {
                const offering = semester
                  ? course.offerings.find((item) => item.period.semester === semester)
                  : course.offerings[0];
                return (
                  <tr key={course.id}>
                    <td><strong>{course.code}</strong><br /><span style={{ color: "var(--muted)" }}>{course.title}</span></td>
                    <td>{course.creditHours}</td>
                    <td>{offering ? `${offering.period.academicYear} · ${offering.period.semester === "SEMESTER_1" ? "Semester 1" : "Semester 2"}` : "No class created"}</td>
                    <td>{offering?.lecturer ? `${offering.lecturer.firstName} ${offering.lecturer.lastName}` : "Unassigned"}</td>
                    <td>{course._count.students}</td>
                    <td><Badge tone={(offering?.status ?? course.status) === "ACTIVE" ? "success" : "neutral"}>{offering?.status ?? course.status}</Badge></td>
                    <td><Link className="ui-button ui-button--secondary ui-button--sm" href={`/admin/courses/${course.id}`}>Manage</Link></td>
                  </tr>
                );
              }) : (
                <tr><td colSpan={6}>No courses match your filters.</td></tr>
              )}
            </tbody>
          </table></PaginatedTable>
      </Card>

      {modalOpen ? (
        <div className="modal-backdrop" role="presentation" onMouseDown={(event) => {
          if (event.target === event.currentTarget && !saving) setModalOpen(false);
        }}>
          <form className="modal modal--wide" role="dialog" aria-modal="true" aria-labelledby="create-course-title" onSubmit={submit}>
            <div className="modal__head">
              <div>
                <h3 id="create-course-title">Create Course</h3>
                <p>Create the course and its semester class in one step.</p>
              </div>
              <button className="modal__close" type="button" aria-label="Close" disabled={saving} onClick={() => setModalOpen(false)}><X size={17} /></button>
            </div>
            <div className="modal__body"><div className="form-grid">
              <div className="form-field"><label htmlFor="course-code">Course code</label><input id="course-code" required value={form.code} onChange={(event) => setForm({ ...form, code: event.target.value })} placeholder="CSC 214" /></div>
              <div className="form-field"><label htmlFor="course-credits">Credit hours</label><input id="course-credits" required type="number" min="1" max="12" placeholder="e.g. 3" value={form.creditHours} onChange={(event) => setForm({ ...form, creditHours: event.target.value })} /></div>
              <div className="form-field"><label htmlFor="course-title">Course title</label><input id="course-title" required value={form.title} onChange={(event) => setForm({ ...form, title: event.target.value })} placeholder="Database Management Systems" /></div>
              <div className="form-field"><label htmlFor="academic-year">Academic year</label><input id="academic-year" required pattern="\d{4}/\d{4}" value={form.academicYear} onChange={(event) => setForm({ ...form, academicYear: event.target.value })} placeholder="2026/2027" /></div>
              <div className="form-field"><label htmlFor="course-semester">Semester</label><select id="course-semester" value={form.semester} onChange={(event) => setForm({ ...form, semester: event.target.value })}><option value="SEMESTER_1">Semester 1</option><option value="SEMESTER_2">Semester 2</option></select></div>
              <div className="form-field"><label htmlFor="course-lecturer">Lecturer (optional)</label><select id="course-lecturer" value={form.lecturerId} onChange={(event) => setForm({ ...form, lecturerId: event.target.value })}><option value="">Assign later</option>{lecturers.map((lecturer) => <option key={lecturer.id} value={lecturer.id}>{lecturer.firstName} {lecturer.lastName} · {lecturer.staffNumber}</option>)}</select></div>
              <div className="form-field"><label htmlFor="course-status">Status</label><select id="course-status" value={form.status} onChange={(event) => setForm({ ...form, status: event.target.value })}><option value="ACTIVE">Active</option><option value="INACTIVE">Inactive</option></select></div>
              <div className="form-field"><label>Faculty</label><input readOnly value={faculties[0]?.name ?? "Faculty of Applied Sciences and Technology"} /></div>
              <div className="form-field"><label>Department</label><input readOnly value={departments[0]?.name ?? "Computer Science"} /></div>
              <div className="form-field" style={{ gridColumn: "1 / -1" }}><label>Programmes offering this course</label><div className="programme-options">{departments[0]?.programmes.map((programme) => { const checked = form.programmeIds.includes(programme.id); return <label key={programme.id}><input type="checkbox" checked={checked} onChange={() => setForm({ ...form, programmeIds: checked ? form.programmeIds.filter((id) => id !== programme.id) : [...form.programmeIds, programme.id] })} /><span><strong>{programme.name}</strong><small>{programme.code}</small></span></label>; })}</div>{!form.programmeIds.length ? <small className="field-error">Select at least one programme.</small> : null}</div>
              <div className="form-field" style={{ gridColumn: "1 / -1" }}><label htmlFor="course-description">Description</label><textarea id="course-description" rows={3} value={form.description} onChange={(event) => setForm({ ...form, description: event.target.value })} placeholder="Brief course description" /></div>
            </div></div>
            <div className="modal__footer">
              <Button type="button" variant="secondary" disabled={saving} onClick={() => setModalOpen(false)}>Cancel</Button>
              <Button type="submit" disabled={saving || !form.programmeIds.length}>{saving ? "Creating…" : "Create Course"}</Button>
            </div>
          </form>
        </div>
      ) : null}
    </>
  );
}
