export function Brand({ compact = false }: { compact?: boolean }) {
  return (
    <div className="brand">
      <span className="brand__mark">CC</span>
      {!compact ? (
        <span className="brand__copy">
          <strong>ClassConnect</strong>
          <span>Ho Technical University</span>
        </span>
      ) : null}
    </div>
  );
}
