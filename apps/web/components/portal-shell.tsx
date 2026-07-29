"use client";

import { useEffect, useMemo, useState } from "react";
import type { ComponentType, ReactNode } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import * as Icons from "lucide-react";
import { Avatar } from "@classconnect/ui";
import { Brand } from "./brand";
import { navigation, pageMeta } from "@/lib/navigation";
import type { PortalRole, SessionUser } from "@/lib/types";
import { apiRequest, authApi } from "@/lib/api/client";
import { useToast } from "./toast-provider";

function NavIcon({ name }: { name: string }) {
  const Icon = (Icons as unknown as Record<string, ComponentType<{ size?: number }>>)[name] ?? Icons.Circle;
  return <Icon size={18} />;
}

export function PortalShell({ role, user, children }: { role: PortalRole; user: SessionUser; children: ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const { toast } = useToast();
  const [menuOpen, setMenuOpen] = useState(false);
  const [dark, setDark] = useState(false);
  const [unreadNotifications, setUnreadNotifications] = useState(0);
  const userName = `${user.firstName} ${user.lastName}`;
  const identity = user.studentNumber ?? user.staffNumber ?? user.email;

  const pageKey = useMemo(() => pathname.split("/").slice(2).join("/") || "dashboard", [pathname]);
  const meta =
    pageKey === "settings" && role !== "admin"
      ? { title: "Account Settings", description: "Password and account security" }
      : role === "lecturer" && pageKey.startsWith("courses/")
        ? { title: "Course Details", description: "Course information and enrolled students" }
        : role === "lecturer" && pageKey.startsWith("attendance/session/")
          ? { title: "Attendance Session Details", description: "Session attendance and student records" }
          : role === "student" && pageKey.startsWith("attendance/history/")
            ? { title: "Attendance Details", description: "Your private attendance verification record" }
          : pageMeta[pageKey] ?? pageMeta.dashboard;

  useEffect(() => {
    const saved = window.localStorage.getItem("classconnect-theme") === "dark";
    setDark(saved);
    document.documentElement.classList.toggle("dark", saved);
  }, []);

  useEffect(() => {
    let active = true;
    const loadUnread = () => apiRequest<Array<{ readAt: string | null }>>("/notifications")
      .then((items) => { if (active) setUnreadNotifications(items.filter((item) => !item.readAt).length); })
      .catch(() => undefined);
    void loadUnread();
    const timer = window.setInterval(loadUnread, 30_000);
    window.addEventListener("classconnect:notifications-updated", loadUnread);
    return () => {
      active = false;
      window.clearInterval(timer);
      window.removeEventListener("classconnect:notifications-updated", loadUnread);
    };
  }, []);

  function toggleTheme() {
    const next = !dark;
    setDark(next);
    document.documentElement.classList.toggle("dark", next);
    window.localStorage.setItem("classconnect-theme", next ? "dark" : "light");
  }

  async function signOut() {
    try {
      await authApi.logout();
    } catch {
      // An expired or already-cleared server session is still a successful local sign-out.
    } finally {
      toast("Signed out", "Your secure session has ended.", "info");
      router.replace("/login");
      router.refresh();
    }
  }

  return (
    <div className="portal">
      <aside className="portal-sidebar" data-open={menuOpen}>
        <div className="portal-sidebar__head"><Brand /></div>
        <nav className="portal-nav">
          {navigation[role].map((group) => (
            <div className="portal-nav__group" key={group.label}>
              <div className="portal-nav__label">{group.label}</div>
              {group.items.map((item) => {
                const active = pathname === item.href;
                return (
                  <Link className="portal-nav__item" data-active={active} href={item.href} key={item.href} onClick={() => setMenuOpen(false)}>
                    <NavIcon name={item.icon} /><span>{item.label}</span>
                  </Link>
                );
              })}
            </div>
          ))}
        </nav>
        <div className="portal-sidebar__foot">
          <div className="portal-user">
            <Avatar name={userName} size="sm" />
            <div><strong>{userName}</strong><span>{identity}</span></div>
            <button aria-label="Sign out" onClick={signOut}><Icons.LogOut size={16} /></button>
          </div>
        </div>
      </aside>

      <button className="portal-overlay" data-open={menuOpen} onClick={() => setMenuOpen(false)} aria-label="Close menu" />

      <main className="portal-main">
        <header className="portal-topbar">
          <div className="portal-topbar__left">
            <button className="icon-button mobile-menu" aria-label="Open menu" onClick={() => setMenuOpen(true)}><Icons.Menu /></button>
            <div className="portal-topbar__title"><h1>{meta?.title ?? "ClassConnect"}</h1><p>{meta?.description ?? "Academic performance management"}</p></div>
          </div>
          <div className="portal-topbar__actions">
            <button className="icon-button" aria-label="Refresh current page" title="Refresh current page" onClick={() => window.location.reload()}><Icons.RefreshCw /></button>
            <button className="icon-button" aria-label="Toggle theme" onClick={toggleTheme}>{dark ? <Icons.Sun /> : <Icons.Moon />}</button>
            <Link className="icon-button" href={`/${role}/notifications`} aria-label={`${unreadNotifications} unread notifications`} title="Notifications"><Icons.Bell />{unreadNotifications ? <span className="notification-dot" /> : null}</Link>
          </div>
        </header>
        <div className="portal-content">{children}</div>
      </main>
    </div>
  );
}
