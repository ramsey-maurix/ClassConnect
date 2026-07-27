"use client";

import { useEffect, useState } from "react";
import { AlertTriangle, Bell, CheckCircle2, GraduationCap, X } from "lucide-react";
import { Button, Card } from "@classconnect/ui";
import { ApiError, apiRequest } from "@/lib/api/client";
import { useToast } from "./toast-provider";

type Notification = {
  id: string;
  type: string;
  title: string;
  message: string;
  readAt: string | null;
  createdAt: string;
};

function errorMessage(error: unknown) {
  return error instanceof ApiError ? error.message : "Please try again.";
}

function NotificationIcon({ type }: { type: string }) {
  if (type.includes("RISK") || type.includes("FLAG") || type.includes("WARNING")) return <AlertTriangle size={17} />;
  if (type.includes("GRADE")) return <GraduationCap size={17} />;
  if (type.includes("ATTENDANCE")) return <CheckCircle2 size={17} />;
  return <Bell size={17} />;
}

export function NotificationCentre() {
  const { toast } = useToast();
  const [items, setItems] = useState<Notification[]>([]);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [deleting, setDeleting] = useState(false);

  async function load() {
    try {
      setItems(await apiRequest<Notification[]>("/notifications"));
    } catch (error) {
      toast("Notifications could not be loaded", errorMessage(error), "danger");
    }
  }

  useEffect(() => { void load(); }, []);

  function notifyShell() {
    window.dispatchEvent(new Event("classconnect:notifications-updated"));
  }

  async function readOne(item: Notification) {
    if (item.readAt) return;
    setItems((current) => current.map((entry) => entry.id === item.id ? { ...entry, readAt: new Date().toISOString() } : entry));
    try {
      await apiRequest(`/notifications/${item.id}/read`, { method: "PATCH" });
      notifyShell();
    } catch (error) {
      await load();
      toast("Notification could not be updated", errorMessage(error), "danger");
    }
  }

  async function readAll() {
    try {
      await apiRequest("/notifications/read-all", { method: "PATCH" });
      setItems((current) => current.map((item) => ({ ...item, readAt: item.readAt ?? new Date().toISOString() })));
      notifyShell();
      toast("Notifications updated", "All notifications are marked as read.", "success");
    } catch (error) {
      toast("Notifications could not be updated", errorMessage(error), "danger");
    }
  }

  async function deleteAll() {
    setDeleting(true);
    try {
      await apiRequest("/notifications", { method: "DELETE" });
      setItems([]);
      setConfirmDelete(false);
      notifyShell();
      toast("Notifications deleted", "All your notifications were removed.", "success");
    } catch (error) {
      toast("Notifications could not be deleted", errorMessage(error), "danger");
    } finally {
      setDeleting(false);
    }
  }

  return <div className="stack">
    <div className="page-header page-header--actions"><div className="page-header__actions">
      <Button variant="secondary" disabled={!items.some((item) => !item.readAt)} onClick={() => void readAll()}>Mark all as read</Button>
      <Button variant="danger" disabled={!items.length} onClick={() => setConfirmDelete(true)}>Delete all</Button>
    </div></div>
    <Card><div className="notification-list">
      {items.map((item) => <button className="notification-item" data-unread={!item.readAt} key={item.id} type="button" onClick={() => void readOne(item)}>
        <span className="notification-item__icon"><NotificationIcon type={item.type} /></span>
        <span className="notification-item__content"><strong>{item.title}</strong><span>{item.message}</span></span>
        <time>{new Date(item.createdAt).toLocaleDateString()}</time>
        {!item.readAt ? <span className="notification-item__unread">Unread</span> : null}
      </button>)}
      {!items.length ? <p className="selection-empty">You have no notifications.</p> : null}
    </div></Card>
    {confirmDelete ? <div className="modal-backdrop modal-backdrop--confirm" role="presentation"><section className="modal modal--confirm" role="alertdialog" aria-modal="true" aria-labelledby="delete-notifications-title"><div className="modal__head"><div><h3 id="delete-notifications-title">Delete all notifications?</h3><p>This will permanently clear your notification list.</p></div><button className="modal__close" type="button" aria-label="Close" onClick={() => setConfirmDelete(false)}><X size={16} /></button></div><div className="modal__body"><p>This affects only your account and cannot be undone.</p></div><div className="modal__footer"><Button variant="secondary" onClick={() => setConfirmDelete(false)}>Cancel</Button><Button variant="danger" disabled={deleting} onClick={() => void deleteAll()}>{deleting ? "Deleting…" : "Delete all"}</Button></div></section></div> : null}
  </div>;
}
