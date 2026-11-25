"use client";

import { useCallback, useEffect, useState } from "react";
import DataTable, { type TableColumn } from "@/components/data-table";
import { toast } from "sonner";

type Audit = { id: string; action: string; entityType: string; entityId: string; details: unknown; createdAt: string; admin: { name: string | null; email: string | null } };

export default function AdminAudit() {
  const [rows, setRows] = useState<Audit[]>([]);
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const load = useCallback(async () => {
    setLoading(true);
    const response = await fetch(`/api/admin/audit?page=${page}`, { cache: "no-store" });
    const result: { logs?: Audit[]; total?: number; error?: string } = await response.json();
    if (!response.ok) throw new Error(result.error || "Could not load the audit log.");
    setRows(result.logs ?? []);
    setTotal(result.total ?? 0);
    setLoading(false);
  }, [page]);
  useEffect(() => { void load().catch((error: unknown) => { toast.error(error instanceof Error ? error.message : "Could not load the audit log."); setLoading(false); }); }, [load]);
  const columns: TableColumn<Audit>[] = [
    { key: "createdAt", label: "When", render: (value) => new Date(String(value)).toLocaleString("en-IN") },
    { key: "admin", label: "Admin", render: (_, row) => row.admin.name || row.admin.email || "Admin" },
    { key: "action", label: "Action", render: (value) => String(value).replaceAll(".", " ") },
    { key: "entityType", label: "Record" },
    { key: "entityId", label: "Record ID" },
    { key: "details", label: "Details", render: (value) => value ? JSON.stringify(value) : "—" },
  ];
  return <><DataTable rows={rows} columns={columns} loading={loading} emptyTitle="No actions recorded" emptyDescription="Every admin moderation and operations action will be kept here." />{total > 25 && <div className="table-pagination"><span>Page {page} of {Math.ceil(total / 25)}</span><div><button type="button" disabled={page === 1} onClick={() => setPage((value) => value - 1)}>←</button><button type="button" disabled={page * 25 >= total} onClick={() => setPage((value) => value + 1)}>→</button></div></div>}</>;
}
