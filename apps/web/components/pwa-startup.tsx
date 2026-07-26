"use client";

import { useEffect, useState } from "react";

export function PwaStartup() {
  const [visible, setVisible] = useState(true);

  useEffect(() => {
    if ("serviceWorker" in navigator) {
      const register = () => navigator.serviceWorker.register("/sw.js", { scope: "/" }).catch(() => undefined);
      if (document.readyState === "complete") void register();
      else window.addEventListener("load", register, { once: true });
    }

    const timer = window.setTimeout(() => setVisible(false), 900);
    return () => window.clearTimeout(timer);
  }, []);

  if (!visible) return null;

  return (
    <div className="app-splash" role="status" aria-label="ClassConnect is loading">
      <div className="app-splash__glow" />
      <div className="app-splash__content">
        <div className="app-splash__mark">CC</div>
        <strong>ClassConnect</strong>
        <span>Ho Technical University</span>
        <div className="app-splash__loader"><i /></div>
      </div>
    </div>
  );
}
