import { redirect } from "next/navigation";
import { PortalShell } from "@/components/portal-shell";
import { UserDetailManager } from "@/components/user-detail-manager";
import { getServerSession } from "@/lib/api/server-auth";

export default async function UserDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const user = await getServerSession();
  if (!user) redirect("/login");
  if (user.mustChangePassword) redirect("/change-password");
  if (user.role !== "ADMIN") redirect(`/${user.role.toLowerCase()}/dashboard`);
  const { id } = await params;
  return <PortalShell role="admin" user={user}><UserDetailManager userId={id} /></PortalShell>;
}
