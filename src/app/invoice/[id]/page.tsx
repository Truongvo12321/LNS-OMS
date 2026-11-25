import { notFound } from "next/navigation";
import { db, money, guardPage } from "@/lib/db";
import PrintButton from "./PrintButton";

export const dynamic = "force-dynamic";

const SELLER = ["G-CHOICE BY LNS", "CORPORATION", "3145372680"];
// Địa chỉ Mỹ "12002 Fairpoint Dr, Houston, TX 77099" → 2 dòng như mẫu: số nhà + đường / thành phố, bang zip
const lines = (a?: string | null) => { if (!a) return []; const i = a.indexOf(","); return i < 0 ? [a] : [a.slice(0, i).trim(), a.slice(i + 1).trim()]; };
const ymd = (d: Date) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;

// Hoá đơn theo mẫu của khách (Walmart Marketplace): From / Ship to / Bill to, Item Number = mã hàng trên sàn.
// "Save as PDF" của trình duyệt = xuất PDF, không cần thư viện.
export default async function Invoice({ params }: { params: Promise<{ id: string }> }) {
  await guardPage("orders.view");
  const o = await db.order.findUnique({ where: { id: Number((await params).id) }, include: { customer: true, channel: true, items: { include: { product: true } } } });
  if (!o) notFound();
  const c = o.customer, [brand, ...rest] = o.channel.name.split(" ");
  const block = (title: string, body: (string | null | undefined)[]) => (
    <div><div className="font-bold">{title}</div>{body.filter(Boolean).map((l, i) => <div key={i}>{l}</div>)}</div>
  );

  return (
    <div className="mx-auto max-w-3xl bg-white p-4 text-[13px] text-black sm:p-10">
      <div className="no-print mb-6 flex justify-end"><PrintButton /></div>

      <div className="flex items-start justify-between gap-4">
        <h1 className="text-xl font-bold leading-tight">{SELLER[0]}<br />{SELLER[1]}</h1>
        <div className="text-right leading-tight">
          <div className="text-2xl font-bold text-[#0071ce]">{brand}</div>
          {rest.length > 0 && <div className="text-sm text-[#0071ce]">{rest.join(" ")}</div>}
        </div>
      </div>

      <div className="mt-6 flex flex-wrap justify-between gap-x-6 gap-y-1 border-y border-slate-400 py-2">
        <div><b>Order #:</b> {o.externalRef ?? o.code}</div>
        <div><b>Order Date:</b> {ymd(o.createdAt)}</div>
      </div>

      <div className="my-4 grid gap-4 sm:grid-cols-3 sm:gap-6 print:grid-cols-3">
        {block("From", SELLER)}
        {block("Ship to", [c.name, ...lines(c.address), c.phone])}
        {block("Bill to", [c.name, ...lines(c.billAddress ?? c.address)])}
      </div>

      <div className="overflow-x-auto print:overflow-visible"><table className="w-full min-w-[32rem] border-collapse">
        <thead className="bg-[#b6cfd4]">
          <tr><th className="p-2 text-left">QTY</th><th className="p-2 text-left">Item Number</th><th className="p-2 text-left">Description</th><th className="p-2 text-right">Unit price</th><th className="p-2 text-right">Amount</th></tr>
        </thead>
        <tbody>
          {o.items.map((i) => (
            <tr key={i.id} className="border-b border-slate-300 odd:bg-slate-50">
              <td className="p-2">{i.qty}</td>
              <td className="p-2">{i.product.marketSku ?? i.product.code}</td>
              <td className="p-2 uppercase">{i.product.name}</td>
              <td className="p-2 text-right">{money(i.unitPrice)}</td>
              <td className="p-2 text-right">{money(i.qty * i.unitPrice)}</td>
            </tr>
          ))}
        </tbody>
        <tfoot><tr><td colSpan={4} className="p-2 text-right font-bold">TOTAL</td><td className="p-2 text-right text-base font-bold">{money(o.total)}</td></tr></tfoot>
      </table></div>
      {o.poNumber && <p className="mt-4 text-xs text-slate-600">Purchase order#: {o.poNumber}</p>}
    </div>
  );
}
