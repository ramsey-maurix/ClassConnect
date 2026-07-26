"use client";

import { useState } from "react";
import type { FormEvent } from "react";
import { Eye, EyeOff, KeyRound, ShieldCheck } from "lucide-react";
import { Button, Card, CardHeader } from "@classconnect/ui";
import { ApiError, authApi } from "@/lib/api/client";
import { useToast } from "./toast-provider";

export function AccountSettings() {
  const { toast } = useToast();
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showCurrent, setShowCurrent] = useState(false);
  const [showNew, setShowNew] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
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
      setCurrentPassword(""); setNewPassword(""); setConfirmPassword("");
      toast("Password changed", "Your new password is active. Other refresh sessions were revoked.", "success");
    } catch (error) {
      toast("Password could not be changed", error instanceof ApiError ? error.message : "Please retry.", "danger");
    } finally { setSaving(false); }
  }

  return <div className="grid grid--main"><Card><CardHeader title="Change password" description="Use your current password to protect this account" /><form onSubmit={submit}><div className="form-field"><label>Current password</label><div className="password-field"><input type={showCurrent ? "text" : "password"} autoComplete="current-password" value={currentPassword} onChange={(event) => setCurrentPassword(event.target.value)} required /><button type="button" aria-label={showCurrent ? "Hide password" : "Show password"} onClick={() => setShowCurrent((value) => !value)}>{showCurrent ? <EyeOff size={17} /> : <Eye size={17} />}</button></div></div><div className="form-field"><label>New password</label><div className="password-field"><input type={showNew ? "text" : "password"} autoComplete="new-password" minLength={8} value={newPassword} onChange={(event) => setNewPassword(event.target.value)} required /><button type="button" aria-label={showNew ? "Hide password" : "Show password"} onClick={() => setShowNew((value) => !value)}>{showNew ? <EyeOff size={17} /> : <Eye size={17} />}</button></div></div><div className="form-field"><label>Confirm new password</label><div className="password-field"><input type={showConfirm ? "text" : "password"} autoComplete="new-password" minLength={8} value={confirmPassword} onChange={(event) => setConfirmPassword(event.target.value)} required /><button type="button" aria-label={showConfirm ? "Hide password" : "Show password"} onClick={() => setShowConfirm((value) => !value)}>{showConfirm ? <EyeOff size={17} /> : <Eye size={17} />}</button></div></div><div className="form-actions"><Button disabled={saving || newPassword.length < 8}>{saving ? "Changing…" : "Change password"}</Button></div></form></Card><Card><CardHeader title="Account security" description="Password changes are recorded in the security audit log" /><div className="activity-list"><div className="activity"><span className="activity__icon"><KeyRound size={17} /></span><div><strong>Minimum password length</strong><p>Use at least eight characters and avoid reusing your temporary password.</p></div></div><div className="activity"><span className="activity__icon"><ShieldCheck size={17} /></span><div><strong>Session protection</strong><p>Changing your password revokes other renewable login sessions.</p></div></div></div></Card></div>;
}
