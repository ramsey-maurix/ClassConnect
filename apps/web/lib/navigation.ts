import type { NavGroup, PortalRole } from "./types";

export const portalNames: Record<PortalRole, string> = {
  student: "Student Portal",
  lecturer: "Lecturer Portal",
  admin: "Administration Portal",
};

export const navigation: Record<PortalRole, NavGroup[]> = {
  student: [
    {
      label: "Overview",
      items: [
        { label: "Dashboard", href: "/student/dashboard", icon: "LayoutDashboard" },
        { label: "Mark Attendance", href: "/student/attendance", icon: "MapPinCheck" },
        { label: "Attendance History", href: "/student/attendance/history", icon: "History" },
        { label: "My Grades", href: "/student/grades", icon: "GraduationCap" },
        { label: "GPA & Analytics", href: "/student/analytics", icon: "ChartNoAxesCombined" },
        { label: "Academic Standing", href: "/student/standing", icon: "Award" },
      ],
    },
    {
      label: "Organisation",
      items: [
        { label: "Registered Courses", href: "/student/timetable", icon: "BookOpenText" },
        { label: "Notifications", href: "/student/notifications", icon: "Bell" },
        { label: "My Profile", href: "/student/profile", icon: "UserRound" },
        { label: "Settings", href: "/student/settings", icon: "Settings" },
      ],
    },
  ],
  lecturer: [
    {
      label: "Teaching",
      items: [
        { label: "Dashboard", href: "/lecturer/dashboard", icon: "LayoutDashboard" },
        { label: "My Courses", href: "/lecturer/courses", icon: "BookOpenText" },
        { label: "Attendance Overview", href: "/lecturer/attendance", icon: "ClipboardCheck" },
        { label: "Start Session", href: "/lecturer/attendance/new", icon: "QrCode" },
        { label: "Live Session", href: "/lecturer/attendance/live", icon: "Radio" },
        { label: "Enter Grades", href: "/lecturer/grades", icon: "ListChecks" },
      ],
    },
    {
      label: "Insight",
      items: [
        { label: "Class Analytics", href: "/lecturer/analytics", icon: "ChartSpline" },
        { label: "Students", href: "/lecturer/students", icon: "UsersRound" },
        { label: "Notifications", href: "/lecturer/notifications", icon: "Bell" },
        { label: "Settings", href: "/lecturer/settings", icon: "Settings" },
      ],
    },
  ],
  admin: [
    {
      label: "Institution",
      items: [
        { label: "Dashboard", href: "/admin/dashboard", icon: "LayoutDashboard" },
        { label: "Users Management", href: "/admin/users", icon: "UsersRound" },
        { label: "Academic Structure", href: "/admin/academic-structure", icon: "Network" },
        { label: "Courses", href: "/admin/courses", icon: "BookCopy" },
        { label: "Class Assignments", href: "/admin/enrolments", icon: "UserRoundPlus" },
      ],
    },
    {
      label: "Governance",
      items: [
        { label: "Cohort Analytics", href: "/admin/analytics", icon: "ChartNoAxesCombined" },
        { label: "Reports", href: "/admin/reports", icon: "FileChartColumnIncreasing" },
        { label: "Audit Log", href: "/admin/audit", icon: "ScrollText" },
        { label: "Notifications", href: "/admin/notifications", icon: "Bell" },
        { label: "System Settings", href: "/admin/settings", icon: "Settings" },
      ],
    },
  ],
};

export const pageMeta: Record<string, { title: string; description: string }> = {
  dashboard: { title: "Dashboard", description: "Live academic and attendance overview" },
  attendance: { title: "Attendance", description: "Verified class attendance management" },
  "attendance/history": { title: "Attendance History", description: "Your attendance record by course and session" },
  "attendance/new": { title: "Start Attendance Session", description: "Create a secure GPS-restricted QR or PIN session" },
  "attendance/live": { title: "Live Attendance Session", description: "Monitor verified attendance submissions in real time" },
  grades: { title: "Grades", description: "Assessment marks and course aggregates" },
  analytics: { title: "Analytics", description: "Performance trends and early-warning insights" },
  standing: { title: "Academic Standing", description: "Progression status based on GPA and attendance" },
  timetable: { title: "Registered Courses", description: "Your assigned courses, lecturers and academic periods" },
  notifications: { title: "Notifications", description: "Academic alerts and system updates" },
  profile: { title: "My Profile", description: "Personal, programme and security information" },
  courses: { title: "Courses", description: "Course assignment, offering and performance information" },
  students: { title: "Students", description: "Student records and intervention status" },
  users: { title: "Users Management", description: "Accounts, roles and access control" },
  "academic-structure": { title: "Academic Structure", description: "Fixed FAST, Computer Science and programme structure" },
  enrolments: { title: "Class Assignments", description: "Add existing student accounts to their courses" },
  reports: { title: "Reports Centre", description: "Generate attendance, performance and cohort reports" },
  audit: { title: "Audit Log", description: "Immutable record of sensitive system actions" },
  settings: { title: "System Settings", description: "Thresholds, security and institutional configuration" },
};
