import type {
  ButtonHTMLAttributes,
  HTMLAttributes,
  PropsWithChildren,
  ReactNode,
} from "react";

function cx(...values: Array<string | false | null | undefined>) {
  return values.filter(Boolean).join(" ");
}

export type Tone = "brand" | "success" | "warning" | "danger" | "info" | "neutral";

export function Button({
  className,
  variant = "primary",
  size = "md",
  ...props
}: ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: "primary" | "secondary" | "danger" | "ghost";
  size?: "sm" | "md" | "lg";
}) {
  return (
    <button
      className={cx("ui-button", `ui-button--${variant}`, `ui-button--${size}`, className)}
      {...props}
    />
  );
}

export function Card({
  className,
  children,
  ...props
}: PropsWithChildren<HTMLAttributes<HTMLDivElement>>) {
  return (
    <section className={cx("ui-card", className)} {...props}>
      {children}
    </section>
  );
}

export function CardHeader({
  title,
  description,
  action,
  className,
}: {
  title: ReactNode;
  description?: ReactNode;
  action?: ReactNode;
  className?: string;
}) {
  return (
    <div className={cx("ui-card-header", className)}>
      <div>
        <h3>{title}</h3>
        {description ? <p>{description}</p> : null}
      </div>
      {action ? <div className="ui-card-header__action">{action}</div> : null}
    </div>
  );
}

export function Badge({
  className,
  tone = "neutral",
  children,
  ...props
}: PropsWithChildren<HTMLAttributes<HTMLSpanElement>> & { tone?: Tone }) {
  return (
    <span className={cx("ui-badge", `ui-badge--${tone}`, className)} {...props}>
      {children}
    </span>
  );
}

export function Avatar({
  name,
  size = "md",
  className,
}: {
  name: string;
  size?: "sm" | "md" | "lg";
  className?: string;
}) {
  const initials = name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase())
    .join("");

  return (
    <span className={cx("ui-avatar", `ui-avatar--${size}`, className)} aria-label={name}>
      {initials || "CC"}
    </span>
  );
}

export function Progress({
  value,
  tone = "brand",
  className,
}: {
  value: number;
  tone?: Tone;
  className?: string;
}) {
  const safeValue = Math.max(0, Math.min(100, value));
  return (
    <div
      className={cx("ui-progress", className)}
      role="progressbar"
      aria-valuemin={0}
      aria-valuemax={100}
      aria-valuenow={safeValue}
    >
      <span className={`ui-progress__value ui-progress__value--${tone}`} style={{ width: `${safeValue}%` }} />
    </div>
  );
}

export function StatCard({
  label,
  value,
  icon,
  meta,
  trend,
  trendTone = "success",
}: {
  label: ReactNode;
  value: ReactNode;
  icon?: ReactNode;
  meta?: ReactNode;
  trend?: ReactNode;
  trendTone?: Tone;
}) {
  return (
    <Card className="ui-stat-card">
      <div className="ui-stat-card__top">
        <span className="ui-stat-card__icon">{icon}</span>
        {trend ? <Badge tone={trendTone}>{trend}</Badge> : null}
      </div>
      <strong className="ui-stat-card__value">{value}</strong>
      <span className="ui-stat-card__label">{label}</span>
      {meta ? <span className="ui-stat-card__meta">{meta}</span> : null}
    </Card>
  );
}

export function EmptyState({
  icon,
  title,
  description,
  action,
}: {
  icon?: ReactNode;
  title: ReactNode;
  description: ReactNode;
  action?: ReactNode;
}) {
  return (
    <div className="ui-empty-state">
      {icon ? <div className="ui-empty-state__icon">{icon}</div> : null}
      <h3>{title}</h3>
      <p>{description}</p>
      {action}
    </div>
  );
}

export { cx };
