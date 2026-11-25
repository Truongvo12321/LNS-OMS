import { Can } from "@/lib/me";
import Link from "next/link";
import { Printer } from "lucide-react";
import { notFound } from "next/navigation";
import { db, money, fdate, MOVE_LABEL, guardPage } from "@/lib/db";
import { setOrderStatus } from "@/lib/actions";
import { Badge, DocHead, Flash, MetaStrip } from "@/components/ui";

export const dynamic = "force-dynamic";

const ACTIONS: Record<string, [string, string, string][]> = {
  DRAFT: [["CONFIRMED", "Xác nhận đơn (trừ kho)", "btn"], ["CANCELLED", "Hủy đơn", "btn-red"]],
  CONFIRMED: [["DELIVERED", "Đã giao hàng", "btn"], ["CANCELLED", "Hủy đơn (hoàn kho)", "btn-red"]],
};

export default async function OrderDetail({ params, searchParams }: { params: Promise<{ id: string }>; searchParams: Promise<Record<string, string>> }) {
  await guardPage("orders.view");
  const [{ id }, sp] = await Promise.all([params, searchParams]);
  const o = await db.order.findUnique({
    where: { id: Number(id) },
    include: { customer: true, channel: true, createdBy: true, items: { include: { product: true } }, movements: { include: { product: true }, orderBy: { id: "asc" } } },
  });
  if (!o) notFound();

  const late = !!o.shipBy && ["DRAFT", "CONFIRMED"].includes(o.status) && o.shipBy < new Date(new Date().toDateString());
  return (
    <div className="space-y-4">
      <DocHead back="/orders" backLabel="Đơn hàng" code={o.code} status={<Badge v={o.status} />}>
        <Link href={`/invoice/${o.id}`} target="_blank" className="btn-ghost"><Printer aria-hidden size={16} />In hoá đơn</Link>
        <Can perm="orders.status">
          {(ACTIONS[o.status] ?? []).map(([to, label, cls]) => (
            <form key={to} action={setOrderStatus}><input type="hidden" name="id" value={o.id} /><input type="hidden" name="status" value={to} /><button className={cls}>{label}</button></form>
          ))}
        </Can>
      </DocHead>
      <Flash sp={{ err: sp.err }} />

      <MetaStrip items={[
        { label: "Khách hàng", value: o.customer.name, sub: [o.customer.phone, o.customer.address].filter(Boolean).join(" · ") || undefined },
        { label: "Kênh bán", value: o.channel.name, sub: [o.externalRef && `Order# ${o.externalRef}`, o.poNumber && `PO# ${o.poNumber}`].filter(Boolean).join(" · ") || undefined },
        { label: "Giao hàng", value: o.shipBy ? <span className={`tabular-nums ${late ? "text-red-700" : ""}`}>{late && "Trễ hạn · "}Trước {o.shipBy.toLocaleDateString("vi-VN")}</span> : <span className="text-slate-500">Chưa đặt hạn</span>, sub: [o.shipMethod, o.carrier].filter(Boolean).join(" · ") || undefined },
        { label: "Lập lúc", value: <span className="tabular-nums">{fdate(o.createdAt)}</span>, sub: `bởi ${o.createdBy?.name ?? "—"}` },
        { label: "Tổng tiền", value: <span className="text-lg tabular-nums">{money(o.total)}</span>, sub: `${o.items.length} dòng hàng` },
      ]} />
      {o.note && <p className="border-l-2 border-line pl-3 text-slate-600"><span className="text-xs font-semibold uppercase tracking-[0.12em] text-slate-500">Ghi chú</span><br />{o.note}</p>}

      <div className="card overflow-x-auto p-0">
        <table className="tbl">
          <thead><tr><th>Mã</th><th>Sản phẩm</th><th className="text-right">SL (thùng)</th><th className="text-right">Đơn giá</th><th className="text-right">Thành tiền</th></tr></thead>
          <tbody>
            {o.items.map((i) => <tr key={i.id}><td className="font-mono">{i.product.code}</td><td>{i.product.name}</td><td className="text-right">{i.qty}</td><td className="text-right">{money(i.unitPrice)}</td><td className="text-right">{money(i.qty * i.unitPrice)}</td></tr>)}
            <tr className="border-t-2 border-ink/20 hover:bg-transparent"><td colSpan={4} className="text-right text-xs font-semibold uppercase tracking-[0.12em] text-slate-500">Tổng cộng</td><td className="text-right text-base font-semibold text-ink">{money(o.total)}</td></tr>
          </tbody>
        </table>
      </div>

      <section>
        <h2 className="mb-2 text-xs font-semibold uppercase tracking-[0.12em] text-slate-500">Phiếu kho liên quan</h2>
        {o.movements.length ? (
          <ul className="divide-y divide-line rounded-lg border border-line bg-white">
            {o.movements.map((m) => (
              <li key={m.id} className="flex flex-wrap items-center gap-x-4 gap-y-1 px-4 py-2.5">
                <Badge v={m.type} label={MOVE_LABEL[m.type]} />
                <span className="font-mono text-xs text-slate-600">{m.product.code}</span>
                <span className={`font-semibold tabular-nums ${m.qty < 0 ? "text-red-700" : "text-emerald-700"}`}>{m.qty > 0 ? "+" : ""}{m.qty}</span>
                <span className="ml-auto text-xs tabular-nums text-slate-500">{fdate(m.createdAt)}</span>
              </li>
            ))}
          </ul>
        ) : <p className="text-slate-500">Chưa có – kho chỉ bị trừ khi đơn được xác nhận.</p>}
      </section>
    </div>
  );
}
