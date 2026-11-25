"use client";
import { useCan } from "@/lib/me";
import Link from "next/link";
import { History, Truck } from "lucide-react";
import { useList } from "@/lib/query";
import { fdate, MOVE_LABEL } from "@/lib/format";
import { createPOFromLowStock } from "@/lib/actions";
import { Badge } from "@/components/ui";
import { FilterSelect, ListState, Pagination, RowMenu } from "@/components/client";
import { useUrlState } from "@/lib/query";

type P = { id: number; code: string; name: string; minStock: number; stock: number; loose: number };
type M = { id: number; createdAt: string; type: string; qty: number; units: number; note: string | null; slip: { id: number; code: string } | null; product: { code: string; name: string }; order: { id: number; code: string } | null; purchaseOrder: { id: number; code: string } | null; createdBy: { name: string } | null };

/** Bảng tồn kho – phân trang riêng bằng ?spage / ?ssize. */
export function StockList({ rev }: { rev: number }) {
  const canOrder = useCan("purchase_orders.manage");
  const q = useList<P>("products", [], { prefix: "s", rev });
  const { href } = useUrlState();
  return (
    <div className="card overflow-hidden p-0">
      <div className="overflow-x-auto">
        <table className="tbl">
          <thead><tr><th>Mã</th><th>Sản phẩm</th><th className="text-center">Tồn (thùng)</th><th className="text-center">Tối thiểu</th><th className="w-24 text-center">Thao tác</th></tr></thead>
          <tbody>
            {q.data?.rows.map((p) => {
              const low = p.stock <= p.minStock;
              return (
                <tr key={p.id} className={low ? "bg-amber-50/70" : ""}>
                  <td className="font-mono">{p.code}</td><td>{p.name}</td>
                  <td className={`text-center font-bold ${low ? "text-red-600" : ""}`}>{p.stock}{p.loose > 0 && <span className="ml-1 text-xs font-normal text-slate-500">+{p.loose} lẻ</span>}</td><td className="text-center">{p.minStock}</td>
                  <td className="w-14 text-center">
                    <RowMenu label={`Thao tác ${p.code}`} items={[
                      { label: "Thẻ kho", icon: History, href: href({ productId: p.id, page: undefined, tab: "history" }), scroll: false },
                      ...(low && canOrder ? [{ label: "Tạo đơn nhập hàng", icon: Truck, action: createPOFromLowStock, fields: { productId: p.id } }] : []),
                    ]} />
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
      <ListState q={q} empty="Chưa có sản phẩm." />
      <Pagination data={q.data} prefix="s" fetching={q.isFetching} />
    </div>
  );
}

export function MovementList({ products, rev }: { products: [number, string][]; rev: number }) {
  const q = useList<M>("movements", ["productId", "type", "from"], { rev });
  const { sp, set } = useUrlState();
  const pid = Number(sp.get("productId"));
  return (
    <section className="card overflow-hidden p-0">
      <div className="filters items-end p-4">
        <h2 className="mr-auto font-semibold text-ink">{pid ? `Thẻ kho ${products.find(([id]) => id === pid)?.[1] ?? ""}` : "Tất cả phiếu xuất nhập"}</h2>
        <FilterSelect name="productId" label="Mọi sản phẩm" className="w-44" options={products} />
        <FilterSelect name="type" label="Mọi loại" className="w-36" options={Object.entries(MOVE_LABEL)} />
        <input type="date" aria-label="Từ ngày" value={sp.get("from") ?? ""} onChange={(e) => set({ from: e.target.value, page: undefined })} className="input w-40" />
      </div>
      <div className="overflow-x-auto border-t border-line">
        <table className="tbl">
          <thead><tr><th>Thời gian</th><th>Loại</th><th>Mã</th><th>Sản phẩm</th><th className="text-right">SL</th><th>Chứng từ</th><th>Ghi chú</th><th>Người lập</th></tr></thead>
          <tbody>
            {q.data?.rows.map((m) => (
              <tr key={m.id}>
                <td className="whitespace-nowrap">{fdate(m.createdAt)}</td><td><Badge v={m.type} label={MOVE_LABEL[m.type]} /></td>
                <td className="font-mono">{m.product.code}</td><td>{m.product.name}</td>
                <td className={`whitespace-nowrap text-right font-semibold ${m.qty + m.units < 0 ? "text-red-600" : "text-emerald-700"}`}>{m.qty > 0 ? "+" : ""}{m.qty || (m.units ? "" : 0)}{m.units !== 0 && <span className="ml-1 text-xs font-normal">{m.units > 0 ? "+" : ""}{m.units} lẻ</span>}</td>
                <td>{m.order && <Link className="link font-mono" href={`/orders/${m.order.id}`}>{m.order.code}</Link>}{m.purchaseOrder && <Link className="link font-mono" href={`/purchase-orders/${m.purchaseOrder.id}`}>{m.purchaseOrder.code}</Link>}{m.slip && <Link className="link font-mono" href={`/inventory/slips/${m.slip.id}`}>{m.slip.code}</Link>}</td>
                <td className="text-slate-500">{m.note}</td><td>{m.createdBy?.name}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <ListState q={q} empty="Chưa có phiếu kho nào." />
      <Pagination data={q.data} fetching={q.isFetching} />
    </section>
  );
}

type S = { id: number; code: string; type: string; status: string; date: string; note: string | null; createdBy: { name: string } | null; approvedBy: { name: string } | null; lines: { cartons: number; units: number; pallets: number }[] };
const SLIP_TYPE: Record<string, string> = { IN: "Nhập kho", OUT: "Xuất kho", DAMAGED: "Hàng hủy" };
const SLIP_STATUS: Record<string, [string, string]> = { PENDING: ["Chờ duyệt", "DRAFT"], APPROVED: ["Đã duyệt", "DELIVERED"], REJECTED: ["Từ chối", "CANCELLED"] };

/** Danh sách phiếu kho nhiều dòng – lọc theo trạng thái / loại, phân trang ?kpage. */
export function SlipList({ rev }: { rev: number }) {
  const q = useList<S>("slips", ["status", "stype"], { prefix: "k", rev });
  return (
    <section className="card overflow-hidden p-0">
      <div className="filters items-end p-4">
        <h2 className="mr-auto font-semibold text-ink">Phiếu nhập / xuất kho</h2>
        <FilterSelect name="status" label="Mọi trạng thái" className="w-40" pageKey="kpage" options={Object.entries(SLIP_STATUS).map(([k, [l]]) => [k, l])} />
        <FilterSelect name="stype" label="Mọi loại phiếu" className="w-40" pageKey="kpage" options={Object.entries(SLIP_TYPE)} />
      </div>
      <div className="overflow-x-auto border-t border-line">
        <table className="tbl">
          <thead><tr><th>Số phiếu</th><th>Ngày</th><th>Loại</th><th className="text-right">Số dòng</th><th className="text-right">Thùng</th><th className="text-right">Lẻ</th><th>Người lập</th><th className="text-center">Trạng thái</th><th>Người duyệt</th></tr></thead>
          <tbody>
            {q.data?.rows.map((k) => {
              const [label, tone] = SLIP_STATUS[k.status];
              return (
                <tr key={k.id}>
                  <td><Link className="link font-mono" href={`/inventory/slips/${k.id}`}>{k.code}</Link></td>
                  <td className="whitespace-nowrap tabular-nums">{new Date(k.date).toLocaleDateString("vi-VN")}</td>
                  <td>{SLIP_TYPE[k.type]}</td>
                  <td className="text-right">{k.lines.length}</td>
                  <td className="text-right">{k.lines.reduce((s, l) => s + l.cartons, 0)}</td>
                  <td className="text-right">{k.lines.reduce((s, l) => s + l.units, 0) || "—"}</td>
                  <td>{k.createdBy?.name}</td>
                  <td className="text-center"><Badge v={tone} label={label} /></td>
                  <td>{k.approvedBy?.name ?? <span className="text-slate-400">—</span>}</td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
      <ListState q={q} empty="Chưa có phiếu kho nào." />
      <Pagination data={q.data} prefix="k" fetching={q.isFetching} />
    </section>
  );
}
