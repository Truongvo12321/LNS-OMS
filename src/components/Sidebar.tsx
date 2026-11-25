"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useMe } from "@/lib/me";
import { LayoutDashboard, ShoppingCart, Users, Package, Warehouse, Truck, ShieldCheck } from "lucide-react";

// Nhóm menu như mục lục sổ sách; `perm` rỗng = ai cũng xem được
export const GROUPS = [
  { title: "Sổ sách", items: [
    { href: "/", label: "Tổng quan", icon: LayoutDashboard, perm: "" },
    { href: "/orders", label: "Đơn hàng", icon: ShoppingCart, perm: "orders.view" },
    { href: "/customers", label: "Khách hàng", icon: Users, perm: "customers.view" },
    { href: "/products", label: "Sản phẩm", icon: Package, perm: "products.view" },
    { href: "/inventory", label: "Kho hàng", icon: Warehouse, perm: "inventory.view" },
    { href: "/purchase-orders", label: "Đơn nhập hàng", icon: Truck, perm: "purchase_orders.view" },
  ] },
  { title: "Hệ thống", items: [{ href: "/users", label: "Phân quyền", icon: ShieldCheck, perm: "users.manage" }] },
];

/** Chỉ hiện menu mà kết quả checkMe (/api/auth/me) cho phép xem. */
export default function Sidebar({ lowCount }: { lowCount: number }) {
  const path = usePathname();
  const allowed: string[] = useMe()?.userPermissions ?? [];
  return (
    <nav aria-label="Điều hướng chính" className="flex flex-col gap-5">
      {GROUPS.map((g) => {
        const items = g.items.filter((n) => !n.perm || allowed.includes(n.perm));
        if (!items.length) return null;
        return (
          <div key={g.title}>
            <p className="mb-1.5 px-3 text-[11px] font-semibold uppercase tracking-[0.14em] text-slate-400">{g.title}</p>
            <ul className="space-y-0.5">
              {items.map(({ href, label, icon: Icon }) => {
                const active = href === "/" ? path === "/" : path.startsWith(href);
                return (
                  <li key={href}>
                    <Link href={href} aria-current={active ? "page" : undefined}
                      className={`relative flex min-h-9 shrink-0 items-center gap-2.5 whitespace-nowrap rounded-md px-3 transition-colors duration-150 ${active ? "font-semibold text-ink before:absolute before:inset-y-2 before:left-0 before:w-0.5 before:rounded-full before:bg-brand-700" : "text-slate-600 hover:bg-muted hover:text-ink"}`}>
                      <Icon aria-hidden size={16} strokeWidth={active ? 2.2 : 1.8} className={active ? "text-brand-700" : "text-slate-400"} />
                      {label}
                      {href === "/purchase-orders" && lowCount > 0 && (
                        <span className="ml-auto font-mono text-xs font-semibold text-amber-700" aria-label={`${lowCount} sản phẩm sắp hết`}>{lowCount}</span>
                      )}
                    </Link>
                  </li>
                );
              })}
            </ul>
          </div>
        );
      })}
    </nav>
  );
}
