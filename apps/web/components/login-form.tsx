"use client";

import { useState } from "react";
import type { FormEvent } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@classconnect/ui";
import { Eye, EyeOff, LoaderCircle, LockKeyhole, MapPinned, ShieldCheck } from "lucide-react";
import { ApiError, authApi } from "@/lib/api/client";
import { Brand } from "./brand";
import { useToast } from "./toast-provider";

function safeReturnPath(value: string | undefined, role: string) {
  if (!value || !value.startsWith("/") || value.startsWith("//")) return `/${role}/dashboard`;
  return value.startsWith(`/${role}/`) ? value : `/${role}/dashboard`;
}

export function LoginForm({ next }: { next?: string }) {
  const router = useRouter();
  const { toast } = useToast();
  const [identifier, setIdentifier] = useState("");
  const [password, setPassword] = useState("");
  const [rememberMe, setRememberMe] = useState(true);
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!identifier || !password) {
      toast("Complete the login form", "Email or ID and password are required.", "warning");
      return;
    }
    setLoading(true);
    try {
      const { user } = await authApi.login({ identifier, password, rememberMe });
      const role = user.role.toLowerCase();
      toast("Welcome back", `Signed in as ${user.firstName} ${user.lastName}.`, "success");
      const destination = safeReturnPath(next, role);
      router.replace(user.mustChangePassword ? `/change-password?next=${encodeURIComponent(destination)}` : destination);
      router.refresh();
    } catch (error) {
      const message = error instanceof ApiError ? error.message : "The server could not be reached. Please try again.";
      toast("Sign in failed", message, "danger");
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="auth-page">
      <section className="auth-hero">
        <Brand />
        <div className="auth-hero__content">
          <span className="auth-eyebrow"><ShieldCheck size={15} /> Integrated performance management</span>
          <h1>Every class. Every grade. One clear academic picture.</h1>
          <p>
            ClassConnect complements the university learning environment with verified attendance,
            consolidated results, early-warning analytics and department reporting.
          </p>
        </div>
        <div className="auth-features">
          <div className="auth-feature"><MapPinned /><strong>Verified attendance</strong><span>QR and PIN sessions protected by classroom GPS geofencing.</span></div>
          <div className="auth-feature"><ShieldCheck /><strong>Role-based access</strong><span>Dedicated experiences for students, lecturers and administrators.</span></div>
          <div className="auth-feature"><LockKeyhole /><strong>Secure session model</strong><span>Prepared for JWT authentication through secure HTTP-only cookies.</span></div>
        </div>
      </section>

      <section className="auth-panel">
        <form className="login-card" onSubmit={submit}>
          <h2>Welcome back</h2>
          <p className="login-card__intro">Sign in with the institutional account created for you by an administrator.</p>

          <div className="form-field">
            <label htmlFor="identifier">Institutional email or ID number</label>
            <input
              id="identifier"
              type="text"
              value={identifier}
              onChange={(event) => setIdentifier(event.target.value)}
              autoComplete="username"
              placeholder="Email, student ID, or staff ID"
            />
          </div>
          <div className="form-field">
            <label htmlFor="password">Password</label>
            <div className="password-field">
              <input
                id="password"
                type={showPassword ? "text" : "password"}
                value={password}
                onChange={(event) => setPassword(event.target.value)}
                autoComplete="current-password"
              />
              <button
                type="button"
                aria-label={showPassword ? "Hide password" : "Show password"}
                title={showPassword ? "Hide password" : "Show password"}
                onClick={() => setShowPassword((current) => !current)}
              >
                {showPassword ? <EyeOff size={17} /> : <Eye size={17} />}
              </button>
            </div>
          </div>

          <div className="login-row">
            <label><input type="checkbox" checked={rememberMe} onChange={(event) => setRememberMe(event.target.checked)} /> Keep me signed in</label>
            <button className="text-button" type="button">Forgot password?</button>
          </div>

          <Button className="w-full" size="lg" disabled={loading}>
            {loading ? <><LoaderCircle size={17} className="animate-spin" /> Signing in…</> : <>Sign in to ClassConnect</>}
          </Button>

          <div className="login-help">Your role is identified securely from your account. Passwords and session tokens are never stored in browser storage.</div>
        </form>
      </section>
    </main>
  );
}
