"use client";

import { useEffect, useState } from "react";
import type { FormEvent } from "react";
import { Building2, Plus, University, X } from "lucide-react";
import { Badge, Button, Card, StatCard } from "@classconnect/ui";
import { ApiError, apiRequest } from "@/lib/api/client";
import { PageHeader } from "./display";
import { useToast } from "./toast-provider";

type Programme = { id: string; code: string; name: string; awardType: string; durationYears: number; status: "ACTIVE" | "INACTIVE" };
type Department = { id: string; code: string; name: string; status: "ACTIVE" | "INACTIVE"; programmes: Programme[] };
type Faculty = { id: string; code: string; name: string; status: "ACTIVE" | "INACTIVE"; departments: Department[] };

export function AcademicStructureManager() {
  const { toast } = useToast();
  const [faculties, setFaculties] = useState<Faculty[]>([]);
  const [mode, setMode] = useState<"faculty" | "department" | null>(null);
  const [saving, setSaving] = useState(false);
  const [code, setCode] = useState("");
  const [name, setName] = useState("");
  const [facultyId, setFacultyId] = useState("");

  async function load() {
    try {
      const data = await apiRequest<Faculty[]>("/academic-structure");
      setFaculties(data);
      if (!facultyId && data[0]) setFacultyId(data[0].id);
    } catch (error) {
      toast("Academic structure could not be loaded", error instanceof ApiError ? error.message : "Please retry.", "danger");
    }
  }

  useEffect(() => { void load(); }, []);

  function open(nextMode: "faculty" | "department") {
    setMode(nextMode);
    setCode("");
    setName("");
    setFacultyId(faculties[0]?.id ?? "");
  }

  async function submit(event: FormEvent) {
    event.preventDefault();
    if (!mode) return;
    setSaving(true);
    try {
      await apiRequest(`/academic-structure/${mode === "faculty" ? "faculties" : "departments"}`, {
        method: "POST",
        body: JSON.stringify(mode === "faculty" ? { code, name } : { code, name, facultyId }),
      });
      toast(mode === "faculty" ? "Faculty created" : "Department created", `${code.toUpperCase()} ${name} is now available in forms.`, "success");
      setMode(null);
      await load();
    } catch (error) {
      toast("Record could not be created", error instanceof ApiError ? error.message : "Please retry.", "danger");
    } finally {
      setSaving(false);
    }
  }

  const departmentCount = faculties.reduce((total, faculty) => total + faculty.departments.length, 0);
  return (
    <>
      <PageHeader title="Academic Structure" description="The fixed HTU scope used by this ClassConnect proof of concept." />
      <div className="grid grid--2" style={{ marginBottom: 17 }}><StatCard label="Faculties" value={faculties.length} icon={<University size={20} />} trend="Available" /><StatCard label="Departments" value={departmentCount} icon={<Building2 size={20} />} trend="Available" /></div>
      <Card className="table-shell"><div className="table-wrap"><table><thead><tr><th>Faculty</th><th>Department</th><th>Programme</th><th>Award</th><th>Duration</th><th>Status</th></tr></thead><tbody>
        {faculties.flatMap((faculty) => faculty.departments.flatMap((department) => department.programmes.map((programme) => <tr key={programme.id}><td><strong>{faculty.name}</strong><br /><span style={{ color: "var(--muted)" }}>{faculty.code}</span></td><td>{department.name}<br /><span style={{ color: "var(--muted)" }}>{department.code}</span></td><td><strong>{programme.name}</strong><br /><span style={{ color: "var(--muted)" }}>{programme.code}</span></td><td>{programme.awardType}</td><td>{programme.durationYears} years</td><td><Badge tone={programme.status === "ACTIVE" ? "success" : "neutral"}>{programme.status}</Badge></td></tr>)))}
      </tbody></table></div></Card>
      {mode ? <div className="modal-backdrop" role="presentation" onMouseDown={(event) => { if (event.target === event.currentTarget && !saving) setMode(null); }}>
        <form className="modal" role="dialog" aria-modal="true" aria-labelledby="structure-modal-title" onSubmit={submit}>
          <div className="modal__head"><div><h3 id="structure-modal-title">Add {mode === "faculty" ? "Faculty" : "Department"}</h3><p>This record becomes available in user and course forms.</p></div><button type="button" className="modal__close" aria-label="Close" onClick={() => setMode(null)}><X size={16} /></button></div>
          <div className="modal__body"><div className="form-grid">
            {mode === "department" ? <div className="form-field" style={{ gridColumn: "1 / -1" }}><label>Faculty</label><select required value={facultyId} onChange={(event) => setFacultyId(event.target.value)}>{faculties.map((faculty) => <option value={faculty.id} key={faculty.id}>{faculty.name}</option>)}</select></div> : null}
            <div className="form-field"><label>Code</label><input required value={code} onChange={(event) => setCode(event.target.value)} placeholder={mode === "faculty" ? "FAST" : "CS"} /></div>
            <div className="form-field"><label>Name</label><input required value={name} onChange={(event) => setName(event.target.value)} placeholder={mode === "faculty" ? "Faculty name" : "Department name"} /></div>
          </div></div>
          <div className="modal__footer"><Button type="button" variant="secondary" disabled={saving} onClick={() => setMode(null)}>Cancel</Button><Button type="submit" disabled={saving}>{saving ? "Saving…" : `Add ${mode === "faculty" ? "Faculty" : "Department"}`}</Button></div>
        </form>
      </div> : null}
    </>
  );
}
