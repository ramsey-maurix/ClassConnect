"use client";

import {
  LiveCreateSession,
  LiveGradeBook,
  LiveLecturerAnalytics,
  LiveLecturerAttendanceOverview,
  LiveLecturerCourses,
  LiveLecturerDashboard,
  LiveLecturerNotifications,
  LiveLecturerStudents,
  LiveSessionMonitor,
} from "../lecturer-live";
import { AccountSettings } from "../account-settings";

export function LecturerDashboard() {
  return <LiveLecturerDashboard />;
}

export function LecturerCourses() {
  return <LiveLecturerCourses />;
}

export function LecturerAttendanceOverview() {
  return <LiveLecturerAttendanceOverview />;
}

export function LecturerStartSession() {
  return <LiveCreateSession />;
}

export function LecturerLiveSession() {
  return <LiveSessionMonitor />;
}

export function LecturerGrades() {
  return <LiveGradeBook />;
}

export function LecturerAnalytics() {
  return <LiveLecturerAnalytics />;
}

export function LecturerStudents() {
  return <LiveLecturerStudents />;
}

export function LecturerNotifications() {
  return <LiveLecturerNotifications />;
}

export function LecturerSettings() {
  return <AccountSettings />;
}
