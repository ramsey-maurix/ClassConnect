"use client";

import {
  LiveStudentAnalytics,
  LiveStudentAttendance,
  LiveStudentAttendanceHistory,
  LiveStudentDashboard,
  LiveStudentGrades,
  LiveStudentNotifications,
  LiveStudentProfile,
  LiveStudentStanding,
  LiveStudentTimetable,
} from "../student-live";
import { AccountSettings } from "../account-settings";

export function StudentDashboard() { return <LiveStudentDashboard />; }
export function StudentAttendance() { return <LiveStudentAttendance />; }
export function StudentAttendanceHistory() { return <LiveStudentAttendanceHistory />; }
export function StudentGrades() { return <LiveStudentGrades />; }
export function StudentAnalytics() { return <LiveStudentAnalytics />; }
export function StudentStanding() { return <LiveStudentStanding />; }
export function StudentTimetable() { return <LiveStudentTimetable />; }
export function StudentNotifications() { return <LiveStudentNotifications />; }
export function StudentProfile() { return <LiveStudentProfile />; }
export function StudentSettings() { return <AccountSettings />; }
