import { Can } from "@/lib/me";
import { TriangleAlert } from "lucide-react";
import { alive, db, stockMap, soldLastDays, suggestQty, guardPage } from "@/lib/db";
import { createPOFromLowStock } from "@/lib/actions";
import { Flash } from "@/components/ui";
import POList from "./List";

export const dynamic = "force-dynamic";

export default async function PurchaseOrders({ searchParams }: { searchParams: Promise<Record<string, string>> }) {
  await guardPage("purchase_orders.view");
  const sp = await searchParams;
  const [products, stock, sold] = await Promise.all([
    db.product.findMany({ where: alive, orderBy: { code: "asc" } }),
    stockMap(),
    soldLastDays(30),
  ]);
  const low = products.filter((p) => (stock.get(p.id) ?? 0) <= p.minStock);

  return (
    <div className="space-y-4">
      <h1 className="h1">Đơn nhập hàng</h1>
      <Flash sp={sp} />
      <section className="card border-amber-300">
        <div className="page-head mb-3">
          <h2 className="mr-auto font-semibold max-sm:w-full"><TriangleAlert aria-hidden size={17} className="mr-1.5 inline text-amber-500" />{low.length} sản phẩm dưới mức tồn tối thiểu</h2>
          {low.length > 0 && <Can perm="purchase_orders.manage">
            <form action={createPOFromLowStock} className="filters max-sm:w-full">
              <input name="supplier" placeholder="Nhà cung cấp (tuỳ chọn)" className="input sm:w-52" />
              <button className="btn">Tạo 1 đơn nhập cho tất cả →</button>
            </form>
          </Can>}
        </div>
        {low.length > 0 && (
          <div className="table-scroll -mx-5 px-5"><table className="tbl">
            <thead><tr><th>Mã</th><th>Sản phẩm</th><th className="text-right">Tồn</th><th className="text-right">Tối thiểu</th><th className="text-right">Bán 30 ngày</th><th className="text-right">Gợi ý nhập</th></tr></thead>
            <tbody>{low.map((p) => {
              const s = stock.get(p.id) ?? 0, s30 = sold.get(p.id) ?? 0;
              return <tr key={p.id}><td className="font-mono">{p.code}</td><td>{p.name}</td><td className="text-right font-bold text-red-600">{s}</td><td className="text-right">{p.minStock}</td><td className="text-right">{s30}</td><td className="text-right font-semibold">{suggestQty(s, p.minStock, s30)}</td></tr>;
            })}</tbody>
          </table></div>
        )}
        <p className="mt-2 text-xs text-slate-500">Gợi ý nhập = lượng bán 30 ngày gần nhất + tồn tối thiểu − tồn hiện tại (ít nhất gấp đôi mức tối thiểu). Có thể chỉnh số lượng trong đơn nhập trước khi đặt.</p>
      </section>

      <POList rev={Date.now()} />
    </div>
  );
}
