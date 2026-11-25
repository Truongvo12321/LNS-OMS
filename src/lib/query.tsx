"use client";
import { useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import { QueryClient, QueryClientProvider, keepPreviousData, useQuery, useQueryClient } from "@tanstack/react-query";

export function QueryProvider({ children }: { children: React.ReactNode }) {
  const [client] = useState(() => new QueryClient({ defaultOptions: { queries: { staleTime: 30_000, refetchOnWindowFocus: false } } }));
  return <QueryClientProvider client={client}>{children}</QueryClientProvider>;
}

/** Bộ lọc + phân trang sống trên URL: reload / chia sẻ link vẫn giữ nguyên. replaceState không gọi lại server. */
export function useUrlState() {
  const sp = useSearchParams();
  const set = (patch: Record<string, string | number | undefined>) => {
    const p = new URLSearchParams(sp.toString());
    for (const [k, v] of Object.entries(patch)) {
      if (v === undefined || v === "") p.delete(k); else p.set(k, String(v));
    }
    p.delete("ok"); p.delete("err"); // thông báo flash chỉ hiện một lần
    const qs = p.toString();
    window.history.replaceState(null, "", qs ? `?${qs}` : window.location.pathname);
  };
  /** Link giữ nguyên bộ lọc hiện tại, chỉ đổi vài tham số (vd. ?edit=). */
  const href = (patch: Record<string, string | number | undefined>) => {
    const p = new URLSearchParams(sp.toString());
    for (const [k, v] of Object.entries(patch)) {
      if (v === undefined) p.delete(k); else p.set(k, String(v));
    }
    return `?${p}`;
  };
  return { sp, set, href };
}

export type Page<T> = { rows: T[]; total: number; page: number; size: number };

/**
 * useQuery cho /api/<resource>. `keys` = tham số URL dùng làm bộ lọc; `prefix` cho phép 2 bảng trên một trang
 * (vd. "s" → spage/ssize). `rev` đổi mỗi lần server render lại (sau server action) → làm mới dữ liệu.
 */
export function useList<T>(resource: string, keys: string[], { prefix = "", rev }: { prefix?: string; rev?: number } = {}) {
  const { sp } = useUrlState();
  const qs = new URLSearchParams();
  for (const k of keys) { const v = sp.get(k); if (v) qs.set(k, v); }
  qs.set("page", sp.get(prefix + "page") ?? "1");
  qs.set("size", sp.get(prefix + "size") ?? "20");
  const qc = useQueryClient();
  useEffect(() => { if (rev) qc.invalidateQueries({ queryKey: [resource] }); }, [rev, qc, resource]);
  return useQuery<Page<T>>({
    queryKey: [resource, qs.toString()],
    queryFn: async () => {
      const r = await fetch(`/api/${resource}?${qs}`);
      if (r.status === 401) { window.location.href = "/login"; throw new Error("Phiên đăng nhập đã hết hạn"); }
      if (r.status === 403) throw new Error("Bạn không có quyền xem dữ liệu này");
      if (!r.ok) throw new Error(`Lỗi tải dữ liệu (${r.status})`);
      return r.json();
    },
    placeholderData: keepPreviousData,
  });
}
