import { redirect } from "next/navigation";
import { ChangePasswordForm } from "@/components/change-password-form";
import { getServerSession } from "@/lib/api/server-auth";

export default async function ChangePasswordPage({ searchParams }: { searchParams: Promise<{ next?: string }> }) {
  const { next } = await searchParams;
  const user = await getServerSession();
  if (!user) redirect(next ? `/login?next=${encodeURIComponent(next)}` : "/login");
  if (!user.mustChangePassword) redirect(`/${user.role.toLowerCase()}/dashboard`);
  return <ChangePasswordForm user={user} next={next} />;
}
