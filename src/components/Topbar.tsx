"use client";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { Search } from "lucide-react";
import { GROUPS } from "./Sidebar";
import { useCan } from "@/lib/me";

// Trang con không có trong menu
const SUB: Record<string, string> = { new: "Tạo mới", import: "Nhập từ sàn" };

/** Thanh trên: nút ☰ (mobile), breadcrumb theo URL, tìm nhanh đơn hàng. Tài khoản nằm ở sidebar / ngăn kéo menu. */
export default function Topbar({ menu }: { menu: React.ReactNode }) {
  const path = usePathname(), router = useRouter();
  const canSearch = useCan("orders.view");
  const seg = path.split("/").filter(Boolean);
  const group = GROUPS.find((g) => g.items.some((i) => (i.href === "/" ? path === "/" : path.startsWith(i.href))));
  const item = group?.items.find((i) => (i.href === "/" ? path === "/" : path.startsWith(i.href)));
  const sub = seg[1] ? SUB[seg[1]] ?? "Chi tiết" : null;

  return (
    <header className="no-print sticky top-0 z-30 flex h-14 items-center gap-3 border-b border-line bg-white/90 px-4 backdrop-blur-sm lg:gap-4 lg:px-10">
      {menu}
      <nav aria-label="Vị trí hiện tại" className="min-w-0">
        <ol className="flex items-center gap-2 truncate text-sm">
          {group && <li className="hidden text-slate-500 sm:block">{group.title}</li>}
          {item && <>
            <li aria-hidden className="hidden text-slate-300 sm:block">/</li>
            <li>{sub ? <Link href={item.href} className="text-slate-600 hover:text-ink">{item.label}</Link> : <span aria-current="page" className="font-medium text-ink">{item.label}</span>}</li>
          </>}
          {sub && <><li aria-hidden className="text-slate-300">/</li><li aria-current="page" className="truncate font-medium text-ink">{sub}</li></>}
        </ol>
      </nav>

      {canSearch && (
        <form role="search" className="relative ml-auto hidden w-full max-w-xs md:block"
          onSubmit={(e) => { e.preventDefault(); const q = String(new FormData(e.currentTarget).get("q") ?? "").trim(); router.push(q ? `/orders?q=${encodeURIComponent(q)}` : "/orders"); }}>
          <Search aria-hidden size={15} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
          <input name="q" type="search" aria-label="Tìm đơn hàng" placeholder="Tìm đơn: mã đơn, mã sàn, khách…" className="input h-9 bg-bg pl-9" />
        </form>
      )}

    </header>
  );
}
