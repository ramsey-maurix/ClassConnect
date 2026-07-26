"use client";

import { useEffect, useState } from "react";
import type { FormEvent } from "react";
import Link from "next/link";
import { ArrowLeft, BookOpen, CalendarRange, UsersRound } from "lucide-react";
import { Badge, Button, Card, CardHeader, StatCard } from "@classconnect/ui";
import { ApiError, apiRequest } from "@/lib/api/client";
import { useToast } from "./toast-provider";

type CourseDetail = {
  id: string; code: string; title: string; description: string | null; creditHours: number; status: "ACTIVE" | "INACTIVE";
  department: { name: string; faculty: { name: string } } | null;
  programmes: Array<{ programme: { id: string; code: string; name: string } }>;
  students: Array<{ student: { id: string; firstName: string; lastName: string; studentNumber: string | null } }>;
  lecturers: Array<{ lecturer: { id: string; firstName: string; lastName: string; staffNumber: string | null } }>;
  offerings: Array<{ id: string; status: "ACTIVE" | "INACTIVE"; period: { academicYear: string; semester: "SEMESTER_1" | "SEMESTER_2" }; lecturer: { firstName: string; lastName: string } | null; _count: { students: number } }>;
};

export function CourseDetailManager({ courseId }: { courseId: string }) {
  const { toast } = useToast();
  const [course, setCourse] = useState<CourseDetail | null>(null);
  const [form, setForm] = useState({ title: "", description: "", creditHours: "3", status: "ACTIVE" });

  async function load() {
    try {
      const record = await apiRequest<CourseDetail>(`/courses/${courseId}`);
      setCourse(record);
      setForm({ title: record.title, description: record.description ?? "", creditHours: String(record.creditHours), status: record.status });
    } catch (error) { toast("Course could not be loaded", error instanceof ApiError ? error.message : "Please retry.", "danger"); }
  }
  useEffect(() => { void load(); }, [courseId]);

  async function save(event: FormEvent) {
    event.preventDefault();
    try {
      await apiRequest(`/courses/${courseId}`, { method: "PATCH", body: JSON.stringify({ title: form.title, description: form.description || undefined, creditHours: Number(form.creditHours), status: form.status }) });
      toast("Course updated", "Course information was saved.", "success");
      await load();
    } catch (error) { toast("Course update failed", error instanceof ApiError ? error.message : "Please retry.", "danger"); }
  }

  if (!course) return <Card>Loading course details…</Card>;
  return <>
    <div className="detail-heading"><Link className="text-button" href="/admin/courses"><ArrowLeft size={15} /> Courses</Link><div><h2>{course.code} · {course.title}</h2><p>{course.department?.faculty.name} · {course.department?.name}</p></div><Badge tone={course.status === "ACTIVE" ? "success" : "neutral"}>{course.status}</Badge></div>
    <div className="grid grid--3" style={{ marginBottom: 17 }}><StatCard label="Semester classes" value={course.offerings.length} icon={<CalendarRange size={20} />} /><StatCard label="Student access" value={course.students.length} icon={<UsersRound size={20} />} /><StatCard label="Programmes" value={course.programmes.length} icon={<BookOpen size={20} />} /></div>
    <div className="grid grid--main"><form onSubmit={save}><Card><CardHeader title="Course information" description="Edit reusable catalogue details" /><div className="form-grid">
      <div className="form-field"><label>Course code</label><input readOnly value={course.code} /></div><div className="form-field"><label>Credit hours</label><input type="number" min={1} max={12} value={form.creditHours} onChange={(e) => setForm({ ...form, creditHours: e.target.value })} /></div>
      <div className="form-field" style={{ gridColumn: "1 / -1" }}><label>Course title</label><input required value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} /></div>
      <div className="form-field"><label>Faculty</label><input readOnly value={course.department?.faculty.name ?? "FAST"} /></div><div className="form-field"><label>Department</label><input readOnly value={course.department?.name ?? "Computer Science"} /></div>
      <div className="form-field"><label>Status</label><select value={form.status} onChange={(e) => setForm({ ...form, status: e.target.value })}><option value="ACTIVE">Active</option><option value="INACTIVE">Inactive</option></select></div>
      <div className="form-field" style={{ gridColumn: "1 / -1" }}><label>Description</label><textarea rows={4} value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} /></div>
    </div><div className="form-actions"><Button>Save Changes</Button></div></Card></form>
    <div className="stack"><Card><CardHeader title="Applicable programmes" description="Programmes currently offering this course" />{course.programmes.map(({ programme }) => <div className="activity" key={programme.id}><span className="activity__icon"><BookOpen size={16} /></span><div><strong>{programme.name}</strong><p>{programme.code}</p></div></div>)}</Card>
    <Card><CardHeader title="Semester classes" description="Historical and active class instances" action={<Link className="text-button" href="/admin/enrolments">Class assignments</Link>} />{course.offerings.map((offering) => <div className="activity" key={offering.id}><span className="activity__icon"><CalendarRange size={16} /></span><div><strong>{offering.period.academicYear} · {offering.period.semester === "SEMESTER_1" ? "Semester 1" : "Semester 2"}</strong><p>{offering.lecturer ? `${offering.lecturer.firstName} ${offering.lecturer.lastName}` : "Lecturer unassigned"} · {offering._count.students} students</p></div><Badge tone={offering.status === "ACTIVE" ? "success" : "neutral"}>{offering.status}</Badge></div>)}</Card></div></div>
  </>;
}
