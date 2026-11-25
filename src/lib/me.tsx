"use client";
import { useEffect, useState } from "react";
import { usePathname } from "next/navigation";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import type { Me } from "./db";
import type { Perm } from "./perms";

const KEY = ["me"];
const toLogin = (msg: string) => { window.location.href = `/login?err=${encodeURIComponent(msg)}`; };

async function fetchMe(): Promise<Me> {
  const r = await fetch("/api/auth/me", { cache: "no-store" });
  if (r.status === 401) { toLogin("Phiên đăng nhập đã hết hạn, vui lòng đăng nhập lại"); throw new Error("401"); }
  const body = await r.json();
  if (!body.success) throw new Error(body.message ?? "checkMe lỗi");
  return body.result;
}

/** Thông tin người dùng + quyền từ /api/auth/me (dùng chung cache TanStack Query). */
export const useMe = () => useQuery({ queryKey: KEY, queryFn: fetchMe, staleTime: Infinity }).data;

/** Có quyền `p` (hoặc một trong các quyền nếu truyền mảng) theo kết quả checkMe. */
export function useCan(p: Perm | Perm[]) {
  const me = useMe();
  return !!me && (Array.isArray(p) ? p : [p]).some((x) => me.userPermissions.includes(x));
}

/** Chỉ hiện children khi có quyền; `fallback` hiện khi không có. Server vẫn kiểm tra quyền thật ở action / API. */
export function Can({ perm, fallback = null, children }: { perm: Perm | Perm[]; fallback?: React.ReactNode; children: React.ReactNode }) {
  return useCan(perm) ? children : fallback;
}

/**
 * Nạp "me" do server render sẵn (không nháy giao diện), rồi gọi lại /api/auth/me MỖI LẦN CHUYỂN TRANG
 * và đúng lúc token hết hạn → 401 thì đưa về trang đăng nhập.
 */
export function MeProvider({ initial, children }: { initial: Me; children: React.ReactNode }) {
  const qc = useQueryClient(), path = usePathname();
  useState(() => qc.setQueryData(KEY, initial)); // chạy 1 lần, trước khi con render
  const me = useMe();

  useEffect(() => { qc.invalidateQueries({ queryKey: KEY }); }, [path, qc]);
  useEffect(() => {
    if (!me) return;
    const ms = new Date(me.tokenExpiresAt).getTime() - Date.now();
    const t = setTimeout(() => qc.invalidateQueries({ queryKey: KEY }), Math.max(0, Math.min(ms + 1000, 2 ** 31 - 1)));
    return () => clearTimeout(t);
  }, [me, qc]);
  return children;
}
