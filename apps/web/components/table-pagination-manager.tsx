"use client";

import { useEffect } from "react";
import { usePathname } from "next/navigation";

type PaginationState = {
  page: number;
  size: number;
  controls: HTMLDivElement;
  summary: HTMLSpanElement;
  previous: HTMLButtonElement;
  next: HTMLButtonElement;
  pageLabel: HTMLSpanElement;
};

export function TablePaginationManager() {
  const pathname = usePathname();

  useEffect(() => {
    const states = new Map<HTMLTableElement, PaginationState>();

    const render = (table: HTMLTableElement, state: PaginationState) => {
      const rows = Array.from(table.tBodies[0]?.rows ?? []);
      const totalPages = Math.max(1, Math.ceil(rows.length / state.size));
      state.page = Math.min(state.page, totalPages);
      const start = (state.page - 1) * state.size;
      rows.forEach((row, index) => { row.hidden = index < start || index >= start + state.size; });
      state.summary.textContent = rows.length
        ? `Showing ${start + 1}–${Math.min(start + state.size, rows.length)} of ${rows.length}`
        : "No rows";
      state.pageLabel.textContent = `Page ${state.page} of ${totalPages}`;
      state.previous.disabled = state.page <= 1;
      state.next.disabled = state.page >= totalPages;
      state.controls.hidden = false;
    };

    const enhance = (table: HTMLTableElement) => {
      if (!table.tBodies.length) return;
      const existing = states.get(table);
      if (existing) {
        if (!existing.controls.isConnected) {
          const wrap = table.closest(".table-wrap");
          wrap?.parentElement?.insertBefore(existing.controls, wrap.nextSibling);
        }
        render(table, existing);
        return;
      }
      const controls = document.createElement("div");
      controls.className = "table-pagination";
      const summary = document.createElement("span");
      summary.className = "table-pagination__summary";
      const actions = document.createElement("div");
      actions.className = "table-pagination__actions";
      const label = document.createElement("label");
      label.textContent = "Rows";
      const select = document.createElement("select");
      select.setAttribute("aria-label", "Rows per page");
      [10, 15, 20].forEach((size) => {
        const option = document.createElement("option");
        option.value = String(size);
        option.textContent = String(size);
        select.append(option);
      });
      label.append(select);
      const previous = document.createElement("button");
      previous.type = "button";
      previous.textContent = "Previous";
      const pageLabel = document.createElement("span");
      pageLabel.className = "table-pagination__page";
      const next = document.createElement("button");
      next.type = "button";
      next.textContent = "Next";
      actions.append(label, previous, pageLabel, next);
      controls.append(summary, actions);
      const wrap = table.closest(".table-wrap");
      wrap?.parentElement?.insertBefore(controls, wrap.nextSibling);
      const state: PaginationState = { page: 1, size: 10, controls, summary, previous, next, pageLabel };
      states.set(table, state);
      select.addEventListener("change", () => { state.size = Number(select.value); state.page = 1; render(table, state); });
      previous.addEventListener("click", () => { state.page -= 1; render(table, state); });
      next.addEventListener("click", () => { state.page += 1; render(table, state); });
      render(table, state);
    };

    const refresh = () => document.querySelectorAll<HTMLTableElement>(".portal-content table").forEach(enhance);
    refresh();
    let queued = false;
    const observer = new MutationObserver(() => {
      if (queued) return;
      queued = true;
      queueMicrotask(() => { queued = false; refresh(); });
    });
    const root = document.querySelector(".portal-content");
    if (root) observer.observe(root, { childList: true, subtree: true });
    return () => {
      observer.disconnect();
      states.forEach((state, table) => {
        Array.from(table.tBodies[0]?.rows ?? []).forEach((row) => { row.hidden = false; });
        state.controls.remove();
      });
    };
  }, [pathname]);

  return null;
}
