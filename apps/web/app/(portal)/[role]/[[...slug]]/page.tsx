import type { Metadata } from "next";
import { notFound, redirect } from "next/navigation";
import { PortalContent } from "@/components/portal-content";
import { PortalShell } from "@/components/portal-shell";
import type { PortalRole } from "@/lib/types";
import { pageMeta } from "@/lib/navigation";
import { getServerSession } from "@/lib/api/server-auth";

const roles: PortalRole[] = ["student", "lecturer", "admin"];

export async function generateMetadata({ params }: { params: Promise<{ role: string; slug?: string[] }> }): Promise<Metadata> {
  const { role, slug } = await params;
  const page = slug?.join("/") || "dashboard";
  const meta = pageMeta[page];
  return { title: meta ? `${meta.title} · ${role}` : "Portal" };
}

export default async function PortalPage({
  params,
  searchParams,
}: {
  params: Promise<{ role: string; slug?: string[] }>;
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const { role, slug } = await params;
  const query = await searchParams;
  if (!roles.includes(role as PortalRole)) notFound();
  const portalRole = role as PortalRole;
  const user = await getServerSession();
  const pagePath = `/${role}/${slug?.join("/") || "dashboard"}`;
  const serialized = new URLSearchParams();
  for (const [key, value] of Object.entries(query)) {
    if (Array.isArray(value)) value.forEach((item) => serialized.append(key, item));
    else if (value !== undefined) serialized.set(key, value);
  }
  const returnTo = `${pagePath}${serialized.size ? `?${serialized.toString()}` : ""}`;
  if (!user) redirect(`/login?next=${encodeURIComponent(returnTo)}`);
  if (user.mustChangePassword) redirect(`/change-password?next=${encodeURIComponent(returnTo)}`);
  const authenticatedRole = user.role.toLowerCase() as PortalRole;
  if (authenticatedRole !== portalRole) redirect(`/${authenticatedRole}/dashboard`);
  const page = slug?.join("/") || "dashboard";
  return (
    <PortalShell role={portalRole} user={user}>
      <PortalContent role={portalRole} page={page} />
    </PortalShell>
  );
}
