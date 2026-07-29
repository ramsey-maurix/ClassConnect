import { notFound } from "next/navigation";
import type { ComponentType } from "react";
import type { PortalRole } from "@/lib/types";
import {
  StudentAnalytics,
  StudentAttendance,
  StudentAttendanceHistory,
  StudentDashboard,
  StudentGrades,
  StudentNotifications,
  StudentProfile,
  StudentStanding,
  StudentSettings,
  StudentTimetable,
} from "./pages/student-pages";
import {
  LecturerAnalytics,
  LecturerAttendanceOverview,
  LecturerCourses,
  LecturerCourseDetail,
  LecturerDashboard,
  LecturerGrades,
  LecturerLiveSession,
  LecturerNotifications,
  LecturerStartSession,
  LecturerStudents,
  LecturerSettings,
} from "./pages/lecturer-pages";
import {
  AdminAcademicStructure,
  AdminAnalytics,
  AdminAudit,
  AdminCourses,
  AdminDashboard,
  AdminEnrolments,
  AdminReports,
  AdminSettings,
  AdminUsers,
} from "./pages/admin-pages";
import { LiveLecturerNotifications as AdminNotifications } from "./lecturer-live";

const studentPages: Record<string, ComponentType> = {
  dashboard: StudentDashboard,
  attendance: StudentAttendance,
  "attendance/history": StudentAttendanceHistory,
  grades: StudentGrades,
  analytics: StudentAnalytics,
  standing: StudentStanding,
  timetable: StudentTimetable,
  notifications: StudentNotifications,
  profile: StudentProfile,
  settings: StudentSettings,
};

const lecturerPages: Record<string, ComponentType> = {
  dashboard: LecturerDashboard,
  courses: LecturerCourses,
  attendance: LecturerAttendanceOverview,
  "attendance/new": LecturerStartSession,
  "attendance/live": LecturerLiveSession,
  grades: LecturerGrades,
  analytics: LecturerAnalytics,
  students: LecturerStudents,
  notifications: LecturerNotifications,
  settings: LecturerSettings,
};

const adminPages: Record<string, ComponentType> = {
  dashboard: AdminDashboard,
  users: AdminUsers,
  "academic-structure": AdminAcademicStructure,
  courses: AdminCourses,
  enrolments: AdminEnrolments,
  analytics: AdminAnalytics,
  reports: AdminReports,
  audit: AdminAudit,
  settings: AdminSettings,
  notifications: AdminNotifications,
};

export function PortalContent({ role, page }: { role: PortalRole; page: string }) {
  if (role === "lecturer" && page.startsWith("courses/")) {
    const courseId = page.slice("courses/".length);
    if (!courseId) notFound();
    return <LecturerCourseDetail courseId={courseId} />;
  }
  const group = role === "student" ? studentPages : role === "lecturer" ? lecturerPages : adminPages;
  const Component = group[page];
  if (!Component) notFound();
  return <Component />;
}
