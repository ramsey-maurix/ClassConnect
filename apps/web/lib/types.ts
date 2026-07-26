export type PortalRole = "student" | "lecturer" | "admin";
export type ApiUserRole = "STUDENT" | "LECTURER" | "ADMIN";
export type SessionUser = {
  id: string;
  email: string;
  role: ApiUserRole;
  status: "ACTIVE" | "SUSPENDED" | "DISABLED";
  firstName: string;
  lastName: string;
  studentNumber: string | null;
  staffNumber: string | null;
  phone: string | null;
  profileImageUrl: string | null;
  mustChangePassword: boolean;
  department?: { id: string; name: string; code: string; faculty: { id: string; name: string; code: string } } | null;
  programme?: { id: string; name: string; code: string; awardType: string } | null;
};
export type StatusTone = "brand" | "success" | "warning" | "danger" | "info" | "neutral";

export type NavItem = {
  label: string;
  href: string;
  icon: string;
};

export type NavGroup = {
  label: string;
  items: NavItem[];
};
