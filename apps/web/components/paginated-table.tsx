"use client";

import { Children, cloneElement, isValidElement, useEffect, useMemo, useState } from "react";
import type { ReactElement, ReactNode } from "react";

function countBodyRows(node: ReactNode): number {
  if (!isValidElement(node)) return 0;
  if (node.type === "tbody") return Children.toArray((node.props as { children?: ReactNode }).children).length;
  let total = 0;
  Children.forEach((node.props as { children?: ReactNode }).children, (child) => {
    total += countBodyRows(child);
  });
  return total;
}

function paginateBody(node: ReactNode, start: number, size: number): ReactNode {
  if (!isValidElement(node)) return node;
  const props = node.props as { children?: ReactNode };
  if (node.type === "tbody") {
    return cloneElement(node as ReactElement<{ children?: ReactNode }>, {
      children: Children.toArray(props.children).slice(start, start + size),
    });
  }
  return cloneElement(node as ReactElement<{ children?: ReactNode }>, {
    children: Children.map(props.children, (child) => paginateBody(child, start, size)),
  });
}

export function PaginatedTable({ children }: { children: ReactElement }) {
  const [pageSize, setPageSize] = useState(10);
  const [page, setPage] = useState(1);
  const total = countBodyRows(children);
  const totalPages = Math.max(1, Math.ceil(total / pageSize));
  const currentPage = Math.min(page, totalPages);
  const start = (currentPage - 1) * pageSize;
  const table = useMemo(() => paginateBody(children, start, pageSize), [children, start, pageSize]);

  useEffect(() => {
    if (page > totalPages) setPage(totalPages);
  }, [page, totalPages]);

  return (
    <>
      <div className="table-wrap">{table}</div>
      <div className="table-pagination">
        <span className="table-pagination__summary">
          {total ? `Showing ${start + 1}–${Math.min(start + pageSize, total)} of ${total}` : "No rows"}
        </span>
        <div className="table-pagination__actions">
          <label>Rows
            <select value={pageSize} onChange={(event) => { setPageSize(Number(event.target.value)); setPage(1); }} aria-label="Rows per page">
              <option value={10}>10</option><option value={15}>15</option><option value={20}>20</option>
            </select>
          </label>
          <button type="button" disabled={currentPage === 1} onClick={() => setPage((value) => Math.max(1, value - 1))}>Previous</button>
          <span className="table-pagination__page">Page {currentPage} of {totalPages}</span>
          <button type="button" disabled={currentPage === totalPages} onClick={() => setPage((value) => Math.min(totalPages, value + 1))}>Next</button>
        </div>
      </div>
    </>
  );
}
