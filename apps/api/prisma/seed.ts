import { PrismaClient, UserRole } from "@prisma/client";
import { hash } from "bcryptjs";

const prisma = new PrismaClient();

const programmeInputs = [
  { code: "BTECH-CS", name: "BTech Computer Science", awardType: "BTech", durationYears: 4 },
  { code: "HND-CS", name: "HND Computer Science", awardType: "HND", durationYears: 3 },
  { code: "BTECH-ICT", name: "BTech Information and Communication Technology", awardType: "BTech", durationYears: 4 },
  { code: "HND-ICT", name: "HND Information and Communication Technology", awardType: "HND", durationYears: 3 },
] as const;

async function clearApplicationData() {
  await prisma.$executeRawUnsafe(`
    TRUNCATE TABLE
      "GradeChangeLog",
      "Grade",
      "Assessment",
      "AttendanceRecord",
      "AttendanceSession",
      "RiskAlert",
      "AcademicStanding",
      "Notification",
      "AuditLog",
      "SystemSetting",
      "RefreshSession",
      "ClassStudent",
      "CourseStudent",
      "CourseLecturer",
      "CourseOffering",
      "CourseProgramme",
      "AcademicPeriod",
      "Course",
      "User",
      "Programme",
      "Department",
      "Faculty"
    RESTART IDENTITY CASCADE
  `);
}

async function main() {
  await clearApplicationData();

  const faculty = await prisma.faculty.create({
    data: {
      code: "FAST",
      name: "Faculty of Applied Sciences and Technology",
    },
  });

  const department = await prisma.department.create({
    data: {
      code: "CS",
      name: "Computer Science",
      facultyId: faculty.id,
    },
  });

  for (const programme of programmeInputs) {
    await prisma.programme.create({
      data: { ...programme, departmentId: department.id },
    });
  }

  const admin = await prisma.user.create({
    data: {
      email: "admin@classconnect.edu.gh",
      passwordHash: await hash("ClassConnect123!", 12),
      role: UserRole.ADMIN,
      firstName: "System",
      lastName: "Administrator",
      staffNumber: "ADMIN-001",
      departmentId: department.id,
      mustChangePassword: true,
    },
  });

  const settings = [
    ["institutionName", "ClassConnect", "System display name"],
    ["minimumAttendancePercentage", 75, "Minimum acceptable attendance percentage"],
    ["defaultGpsRadiusMetres", 100, "Default attendance geofence radius"],
    ["defaultSessionDurationMinutes", 15, "Default attendance session duration"],
    ["lateThresholdMinutes", 10, "Minutes after session start before attendance is late"],
    ["academicWarningGpa", 2, "GPA below which an academic warning is generated"],
    ["requireGpsGeofencing", true, "Students must be inside the configured classroom radius"],
    ["flagSuspiciousLocation", true, "Flag suspicious attendance coordinates"],
    ["enableAcademicAlerts", true, "Generate academic and risk notifications"],
    ["enforceGradeEditReasons", true, "Require reasons for published-grade corrections"],
  ] as const;

  for (const [key, value, description] of settings) {
    await prisma.systemSetting.create({
      data: { key, value, description, updatedById: admin.id },
    });
  }

  await prisma.auditLog.create({
    data: {
      actorUserId: admin.id,
      action: "SYSTEM_BOOTSTRAPPED",
      entityType: "System",
      description: "Clean ClassConnect database initialized with required academic structure",
    },
  });

  console.log("ClassConnect clean bootstrap complete.");
  console.log("Admin login: admin@classconnect.edu.gh");
  console.log("Temporary password: ClassConnect123!");
  console.log("The Admin must change this password at first login.");
}

main()
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(async () => prisma.$disconnect());
