"use client";

import { useEffect, useMemo, useState } from "react";
import { ArrowDown, ArrowUp, ChevronLeft, ChevronRight } from "lucide-react";

export type TableColumn<T> = {
  key: keyof T;
  label: string;
  render?: (value: T[keyof T], row: T) => React.ReactNode;
  sortable?: boolean;
};

export default function DataTable<T extends { id: string }>({
  rows,
  columns,
  loading = false,
  emptyTitle = "Nothing to show yet",
  emptyDescription = "This table will fill in as activity arrives.",
}: {
  rows: T[];
  columns: TableColumn<T>[];
  loading?: boolean;
  emptyTitle?: string;
  emptyDescription?: string;
}) {
  const [sortKey, setSortKey] = useState<keyof T | null>(null);
  const [descending, setDescending] = useState(false);
  const [page, setPage] = useState(0);
  const pageSize = 10;
  const sorted = useMemo(() => {
    if (!sortKey) return rows;
    return [...rows].sort((a, b) => {
      const left = a[sortKey];
      const right = b[sortKey];
      const result = typeof left === "number" && typeof right === "number"
        ? left - right
        : String(left ?? "").localeCompare(String(right ?? ""));
      return descending ? -result : result;
    });
  }, [rows, sortKey, descending]);
  const pageCount = Math.max(1, Math.ceil(sorted.length / pageSize));
  const visibleRows = sorted.slice(page * pageSize, (page + 1) * pageSize);
  useEffect(() => {
    if (page >= pageCount) setPage(Math.max(0, pageCount - 1));
  }, [page, pageCount]);

  function chooseSort(key: keyof T) {
    setPage(0);
    if (sortKey === key) setDescending((value) => !value);
    else { setSortKey(key); setDescending(false); }
  }

  return (
    <div className="table-shell">
      <div className="responsive-table-wrap">
        <table className="workspace-table">
          <thead><tr>{columns.map((column) => <th key={String(column.key)}>
            {column.sortable === false ? column.label : <button type="button" onClick={() => chooseSort(column.key)}>{column.label}{sortKey === column.key && (descending ? <ArrowDown size={12} /> : <ArrowUp size={12} />)}</button>}
          </th>)}</tr></thead>
          <tbody>
            {loading ? Array.from({ length: 5 }, (_, row) => <tr key={`skeleton-${row}`}><td colSpan={columns.length}><span className="table-skeleton" /></td></tr>) :
              visibleRows.map((row) => <tr key={row.id}>{columns.map((column) => <td key={String(column.key)}>{column.render ? column.render(row[column.key], row) : String(row[column.key] ?? "—")}</td>)}</tr>)}
          </tbody>
        </table>
      </div>
      {!loading && rows.length === 0 && <div className="table-empty"><span>✳</span><strong>{emptyTitle}</strong><p>{emptyDescription}</p></div>}
      {!loading && rows.length > pageSize && <div className="table-pagination"><span>{page + 1} of {pageCount}</span><div><button type="button" aria-label="Previous page" disabled={page === 0} onClick={() => setPage((value) => Math.max(0, value - 1))}><ChevronLeft size={16} /></button><button type="button" aria-label="Next page" disabled={page >= pageCount - 1} onClick={() => setPage((value) => Math.min(pageCount - 1, value + 1))}><ChevronRight size={16} /></button></div></div>}
    </div>
  );
}
