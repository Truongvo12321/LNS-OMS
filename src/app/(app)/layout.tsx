import { redirect } from "next/navigation";
import { LogOut } from "lucide-react";
import { alive, db, session, stockMap, toMe } from "@/lib/db";
import { logout } from "@/lib/actions";
import Sidebar from "@/components/Sidebar";
import Topbar from "@/components/Topbar";
import MobileNav from "@/components/MobileNav";
import { ConfirmButton } from "@/components/client";
import { QueryProvider } from "@/lib/query";
import { MeProvider } from "@/lib/me";

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const s = await session();
  if (!s) redirect("/login");
  const u = s.user;
  const [products, stock] = await Promise.all([db.product.findMany({ where: alive, select: { id: true, minStock: true } }), stockMap()]);
  const lowCount = products.filter((p) => (stock.get(p.id) ?? 0) <= p.minStock).length;

  const brand = (
    <div className="flex items-center gap-2.5">
      <div className="grid size-8 place-items-center rounded-md bg-ink text-sm font-bold text-white">L</div>
      <div className="leading-tight">
        <div className="font-semibold tracking-tight text-ink">LNS OMS</div>
        <div className="text-xs text-slate-500">Đơn hàng &amp; kho</div>
      </div>
    </div>
  );
  // Khối tài khoản dùng chung: cuối sidebar (desktop), trong ngăn kéo menu (mobile)
  const account = (
    <div className="flex items-center gap-2.5">
      <div className="grid size-8 shrink-0 place-items-center rounded-md border border-line bg-muted text-xs font-semibold text-ink">{u.name[0]}</div>
      <div className="min-w-0 flex-1 leading-tight">
        <div className="truncate text-sm font-medium text-ink">{u.name}</div>
        <div className="truncate text-xs text-slate-500">{u.role.name}</div>
      </div>
      <form action={logout}><ConfirmButton label="Đăng xuất" title="Đăng xuất?" message="Bạn sẽ cần đăng nhập lại để tiếp tục làm việc." confirmLabel="Đăng xuất" className="grid size-9 place-items-center rounded-md text-slate-500 hover:bg-muted hover:text-ink cursor-pointer"><LogOut aria-hidden size={16} /></ConfirmButton></form>
    </div>
  );

  return (
    <QueryProvider>
      {/* "me" render sẵn từ server; client gọi lại /api/auth/me mỗi lần chuyển trang để kiểm tra token & quyền */}
      <MeProvider initial={toMe(u, s.exp)}>
        <div className="min-h-screen lg:flex">
          <aside className="no-print hidden border-r border-line bg-white px-3 py-5 lg:sticky lg:top-0 lg:flex lg:h-screen lg:w-60 lg:shrink-0 lg:flex-col">
            <div className="mb-7 px-3">{brand}</div>
            <div className="min-h-0 flex-1 overflow-y-auto"><Sidebar lowCount={lowCount} /></div>
            <div className="mt-4 border-t border-line px-3 pt-4">{account}</div>
          </aside>
          <div className="min-w-0 flex-1">
            <Topbar menu={<MobileNav brand={brand} nav={<Sidebar lowCount={lowCount} />} account={account} />} />
            <main className="px-4 py-6 lg:px-10 lg:py-8">
              <div className="w-full">{children}</div>
            </main>
          </div>
        </div>
      </MeProvider>
    </QueryProvider>
  );
}
