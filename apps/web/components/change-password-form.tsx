"use client";

import { useState } from "react";
import type { FormEvent } from "react";
import { useRouter } from "next/navigation";
import { Eye, EyeOff } from "lucide-react";
import { Button } from "@classconnect/ui";
import { ApiError, authApi } from "@/lib/api/client";
import type { SessionUser } from "@/lib/types";
import { Brand } from "./brand";
import { useToast } from "./toast-provider";

export function ChangePasswordForm({ user, next }: { user: SessionUser; next?: string }) {
  const router = useRouter();
  const { toast } = useToast();
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [visible, setVisible] = useState({ current: false, next: false, confirm: false });
  const [saving, setSaving] = useState(false);

  async function submit(event: FormEvent) {
    event.preventDefault();
    if (newPassword !== confirmPassword) {
      toast("Passwords do not match", "Enter the same new password twice.", "warning");
      return;
    }
    setSaving(true);
    try {
      await authApi.changePassword({ currentPassword, newPassword });
      toast("Password changed", "Your account is ready to use.", "success");
      const role = user.role.toLowerCase();
      const destination = next && next.startsWith(`/${role}/`) && !next.startsWith("//") ? next : `/${role}/dashboard`;
      router.replace(destination);
      router.refresh();
    } catch (error) {
      toast("Password could not be changed", error instanceof ApiError ? error.message : "Please retry.", "danger");
    } finally {
      setSaving(false);
    }
  }

  return (
    <main className="auth-panel" style={{ minHeight: "100vh" }}>
      <form className="login-card" onSubmit={submit}>
        <Brand />
        <div><h2>Set your password</h2><p className="login-card__intro">For security, replace the temporary password before continuing.</p></div>
        <PasswordInput id="current-password" label="Temporary password" visible={visible.current} onToggle={() => setVisible((value) => ({ ...value, current: !value.current }))} autoComplete="current-password" value={currentPassword} onChange={setCurrentPassword} />
        <PasswordInput id="new-password" label="New password" visible={visible.next} onToggle={() => setVisible((value) => ({ ...value, next: !value.next }))} autoComplete="new-password" value={newPassword} onChange={setNewPassword} />
        <PasswordInput id="confirm-password" label="Confirm new password" visible={visible.confirm} onToggle={() => setVisible((value) => ({ ...value, confirm: !value.confirm }))} autoComplete="new-password" value={confirmPassword} onChange={setConfirmPassword} />
        <Button size="lg" disabled={saving}>{saving ? "Saving…" : "Change Password"}</Button>
      </form>
    </main>
  );
}

function PasswordInput({ id, label, visible, onToggle, autoComplete, value, onChange }: { id: string; label: string; visible: boolean; onToggle: () => void; autoComplete: string; value: string; onChange: (value: string) => void }) {
  return <div className="form-field"><label htmlFor={id}>{label}</label><div className="password-field"><input id={id} type={visible ? "text" : "password"} autoComplete={autoComplete} minLength={8} value={value} onChange={(event) => onChange(event.target.value)} required /><button type="button" aria-label={visible ? `Hide ${label.toLowerCase()}` : `Show ${label.toLowerCase()}`} onClick={onToggle}>{visible ? <EyeOff size={17} /> : <Eye size={17} />}</button></div></div>;
}
