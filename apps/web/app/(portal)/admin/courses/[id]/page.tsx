import { redirect } from "next/navigation";
import { CourseDetailManager } from "@/components/course-detail-manager";
import { PortalShell } from "@/components/portal-shell";
import { getServerSession } from "@/lib/api/server-auth";

export default async function CourseDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const user = await getServerSession();
  if (!user) redirect("/login");
  if (user.mustChangePassword) redirect("/change-password");
  if (user.role !== "ADMIN") redirect(`/${user.role.toLowerCase()}/dashboard`);
  const { id } = await params;
  return <PortalShell role="admin" user={user}><CourseDetailManager courseId={id} /></PortalShell>;
}
