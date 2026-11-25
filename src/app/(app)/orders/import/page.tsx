import { CircleAlert, CircleCheck } from "lucide-react";
import { db, guardPage } from "@/lib/db";
import Link from "next/link";
import { importOrdersCsv } from "@/lib/actions";

const SAMPLE = `order_id,channel,customer,product_code,qty,unit_price
200013751032753,Walmart Marketplace,Elizabeth Lopez,LNS259,1,
200013746358302,Shopee,soo yoon hwang,LNS246,2,57.11
200013746358302,Shopee,soo yoon hwang,LNS247,1,
TT-88123,TikTok Shop,Priscilla Luu,LNS233,1,`;

export default async function ImportOrders({ searchParams }: { searchParams: Promise<Record<string, string>> }) {
  await guardPage("orders.manage");
  const [sp, channels] = await Promise.all([searchParams, db.channel.findMany({ orderBy: { id: "asc" } })]);
  const walmart = channels.find((c) => /walmart/i.test(c.name));
  return (
    <div className="max-w-3xl space-y-4">
      <div>
        <Link href="/orders" className="text-xs font-semibold uppercase tracking-[0.12em] text-slate-500 hover:text-ink">← Đơn hàng</Link>
        <h1 className="h1 mb-0 mt-1">Nhập đơn từ sàn TMĐT</h1>
      </div>
      <ol className="grid gap-px overflow-hidden rounded-lg border border-line bg-line sm:grid-cols-3">
        {[["Xuất file đơn", "Từ Shopee, Lazada, TikTok Shop, Walmart… dạng .csv"], ["Tải lên hoặc dán", "Gom dòng theo mã đơn, tạo khách nếu chưa có"], ["Kiểm tra đơn nháp", "Đơn đã nhập được bỏ qua – nhập lại không bị trùng"]].map(([t, d], i) => (
          <li key={t} className="bg-white px-4 py-3">
            <span className="font-mono text-[11px] text-slate-400">{String(i + 1).padStart(2, "0")}</span>
            <div className="font-medium text-ink">{t}</div><div className="mt-0.5 text-xs text-slate-500">{d}</div>
          </li>
        ))}
      </ol>
      {sp.ok && <div role="status" className="flex items-start gap-2 rounded-md border border-emerald-200 bg-emerald-50 px-4 py-3 text-emerald-800"><CircleCheck aria-hidden size={17} className="mt-px shrink-0" />Tạo mới {sp.ok} đơn, bỏ qua {sp.skip} đơn đã tồn tại. <Link className="link" href="/orders?status=DRAFT">Xem đơn nháp →</Link></div>}
      {sp.err && <div role="alert" className="flex items-start gap-2 rounded-md border border-rose-200 bg-rose-50 px-4 py-3 text-rose-700"><CircleAlert aria-hidden size={17} className="mt-px shrink-0" />{sp.err}</div>}
      <form action={importOrdersCsv} className="card space-y-3">
        <label className="block"><span className="label">Kênh bán (dùng khi file không có cột kênh – vd. file xuất từ Walmart)</span>
          <select name="channelId" className="input" defaultValue={walmart?.id ?? ""}>
            <option value="">— Lấy theo cột “channel” trong file —</option>
            {channels.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
          </select>
        </label>
        <label className="block"><span className="label">Tải file .csv</span><input type="file" name="file" accept=".csv,text/csv" className="input" /></label>
        <label className="block"><span className="label">…hoặc dán nội dung CSV</span>
          <textarea name="text" rows={8} className="input font-mono text-xs" placeholder="order_id,channel,customer,product_code,qty,unit_price" defaultValue={SAMPLE} />
        </label>
        <button className="btn">Nhập đơn</button>
      </form>
      <details className="rounded-lg border border-line bg-white px-4 py-3 text-sm">
        <summary className="cursor-pointer font-medium text-ink">Định dạng file được hỗ trợ</summary>
        <div className="mt-3 space-y-3 text-slate-600">
          <div><b className="text-ink">File xuất gốc của Walmart Seller Center</b> – nhận diện theo tên cột: <code className="font-mono text-xs">PO#, Order#, Order Date, Ship By, Customer Name, Customer Shipping Address, Customer Phone Number, Qty, SKU, Item Cost, Shipping Method, Carrier</code>. Cột SKU được khớp với “Mã trên sàn” của sản phẩm.</div>
          <div><b className="text-ink">Mẫu đơn giản</b> (Shopee, Lazada, TikTok… hoặc tự soạn): <code className="font-mono text-xs">order_id, channel, customer, product_code, qty, unit_price</code> – để trống giá thì lấy giá lẻ.</div>
          <div>Ô có dấu phẩy (vd. địa chỉ) phải nằm trong ngoặc kép – Excel tự làm khi lưu CSV.</div>
        </div>
      </details>
    </div>
  );
}
