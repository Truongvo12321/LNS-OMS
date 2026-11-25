import { Can } from "@/lib/me";
import { notFound } from "next/navigation";
import { db, fdate, stockMap, guardPage } from "@/lib/db";
import { Trash2 } from "lucide-react";
import { removePOItem, setPOStatus, updatePOItem } from "@/lib/actions";
import { ConfirmButton } from "@/components/client";
import { Badge, DocHead, Flash, MetaStrip } from "@/components/ui";

export const dynamic = "force-dynamic";

const ACTIONS: Record<string, [string, string, string][]> = {
  DRAFT: [["ORDERED", "Gửi đặt hàng NCC", "btn"], ["CANCELLED", "Hủy", "btn-red"]],
  ORDERED: [["RECEIVED", "Đã nhận hàng (cộng kho)", "btn"], ["CANCELLED", "Hủy", "btn-red"]],
};

export default async function PODetail({ params, searchParams }: { params: Promise<{ id: string }>; searchParams: Promise<Record<string, string>> }) {
  await guardPage("purchase_orders.view");
  const [{ id }, sp] = await Promise.all([params, searchParams]);
  const [po, stock] = await Promise.all([db.purchaseOrder.findUnique({ where: { id: Number(id) }, include: { items: { where: { deletedAt: null }, include: { product: true } } } }), stockMap()]);
  if (!po) notFound();
  return (
    <div className="space-y-4">
      <DocHead back="/purchase-orders" backLabel="Đơn nhập hàng" code={po.code} status={<Badge v={po.status} />}>
        <Can perm="purchase_orders.manage">
          {(ACTIONS[po.status] ?? []).map(([to, label, cls]) => (
            <form key={to} action={setPOStatus}><input type="hidden" name="id" value={po.id} /><input type="hidden" name="status" value={to} /><button className={cls}>{label}</button></form>
          ))}
        </Can>
      </DocHead>
      <Flash sp={{ err: sp.err }} />
      <MetaStrip items={[
        { label: "Nhà cung cấp", value: po.supplier ?? "—" },
        { label: "Lập lúc", value: <span className="tabular-nums">{fdate(po.createdAt)}</span> },
        { label: "Nhận hàng", value: po.receivedAt ? <span className="tabular-nums">{fdate(po.receivedAt)}</span> : <span className="text-slate-500">Chưa nhận</span> },
        { label: "Số mặt hàng", value: <span className="tabular-nums">{po.items.length}</span>, sub: `${po.items.reduce((s, i) => s + i.qty, 0)} thùng` },
      ]} />
      <div className="card overflow-x-auto p-0">
        <table className="tbl">
          <thead><tr><th>Mã</th><th>Sản phẩm</th><th className="text-right">Tồn hiện tại</th><th className="text-right">SL đặt (thùng)</th></tr></thead>
          <tbody>{po.items.map((i) => (
            <tr key={i.id}>
              <td className="font-mono">{i.product.code}</td><td>{i.product.name}</td><td className="text-right">{stock.get(i.productId) ?? 0}</td>
              <td className="text-right">
                {po.status === "DRAFT" ? (<Can perm="purchase_orders.manage" fallback={<b>{i.qty}</b>}>
                  <div className="flex items-center justify-end gap-1">
                    <form action={updatePOItem} className="flex gap-1">
                      <input type="hidden" name="itemId" value={i.id} /><input type="hidden" name="poId" value={po.id} />
                      <input name="qty" type="number" min={1} required placeholder="SL" aria-label={`Số lượng ${i.product.code}`} defaultValue={i.qty} className="input w-20 text-right" /><button className="btn-ghost text-xs">Lưu</button>
                    </form>
                    <form action={removePOItem}>
                      <input type="hidden" name="itemId" value={i.id} /><input type="hidden" name="poId" value={po.id} />
                      <ConfirmButton label={`Bỏ ${i.product.code}`} className="grid size-9 place-items-center rounded-md text-slate-500 hover:bg-red-50 hover:text-red-600 cursor-pointer" title="Bỏ mặt hàng khỏi đơn nhập?" confirmLabel="Bỏ mặt hàng"
                        message={<>Bỏ <b>{i.product.code} – {i.product.name}</b> ({i.qty} thùng) khỏi {po.code}.</>}>
                        <Trash2 aria-hidden size={16} />
                      </ConfirmButton>
                    </form>
                  </div>
                </Can>) : <b>{i.qty}</b>}
              </td>
            </tr>
          ))}</tbody>
        </table>
      </div>
      {po.status === "DRAFT" && <Can perm="purchase_orders.manage"><p className="text-xs text-slate-500">Sửa số lượng rồi bấm Lưu; bấm biểu tượng thùng rác để bỏ mặt hàng.</p></Can>}
    </div>
  );
}
