"use client";

import { PageHeader } from "../display";
import { AcademicStructureManager } from "../academic-structure-manager";
import { AdminCoursesManager } from "../admin-courses-manager";
import { ClassAssignmentsManager } from "../class-assignments-manager";
import {
  LiveAdminAnalytics,
  LiveAdminAttendance,
  LiveAdminAudit,
  LiveAdminDashboard,
  LiveAdminReports,
  LiveAdminSettings,
} from "../governance-managers";
import { UserDirectoryManager } from "../user-directory-manager";

export const AdminDashboard = LiveAdminDashboard;

export function AdminUsers() {
  return (
    <>
      <PageHeader title="Users Management" description="Create student, lecturer, and administrator accounts with temporary-password protection." />
      <UserDirectoryManager />
    </>
  );
}

export const AdminAcademicStructure = AcademicStructureManager;
export const AdminCourses = AdminCoursesManager;
export const AdminEnrolments = ClassAssignmentsManager;
export const AdminAnalytics = LiveAdminAnalytics;
export const AdminAttendance = LiveAdminAttendance;
export const AdminReports = LiveAdminReports;
export const AdminAudit = LiveAdminAudit;
export const AdminSettings = LiveAdminSettings;
