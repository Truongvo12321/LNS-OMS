"use client";
import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { TriangleAlert, X } from "lucide-react";
import { createOrder } from "@/lib/actions";

type C = { id: number; name: string; channel: string; wholesale: boolean };
type P = { id: number; code: string; name: string; wholesalePrice: number; retailPrice: number; stock: number };
type L = { productId: number; qty: number; unitPrice: number };
const money = (c: number) => "$" + (c / 100).toFixed(2);

export default function OrderForm({ customers, products, defaultCustomerId }: { customers: C[]; products: P[]; defaultCustomerId: number }) {
  const router = useRouter();
  const [customerId, setCustomerId] = useState(defaultCustomerId);
  const [lines, setLines] = useState<L[]>([{ productId: 0, qty: 1, unitPrice: 0 }]);
  const [externalRef, setExternalRef] = useState("");
  const [note, setNote] = useState("");
  const [ship, setShip] = useState({ poNumber: "", shipBy: "", shipMethod: "", carrier: "" });
  const [error, setError] = useState("");
  const [pending, start] = useTransition();
  const cust = customers.find((c) => c.id === customerId);
  // Giá tự lấy theo kênh: khách sỉ → giá sỉ, sàn TMĐT → giá lẻ (vẫn sửa tay được)
  const priceOf = (p: P | undefined, c = cust) => (p ? (c?.wholesale === false ? p.retailPrice : p.wholesalePrice) : 0);
  const set = (i: number, patch: Partial<L>) => setLines(lines.map((l, j) => (j === i ? { ...l, ...patch } : l)));
  const total = lines.reduce((s, l) => s + l.qty * l.unitPrice, 0);

  const submit = () => start(async () => {
    setError("");
    const r = await createOrder({ customerId, externalRef, note, lines, ...ship });
    if ("error" in r) setError(r.error ?? "Lỗi");
    else router.push(`/orders/${r.id}`);
  });

  return (
    <div className="card space-y-4">
      <div className="grid gap-3 md:grid-cols-3">
        <label><span className="label">Khách hàng *</span>
          <select className="input" value={customerId} onChange={(e) => {
            const c = customers.find((x) => x.id === Number(e.target.value));
            setCustomerId(Number(e.target.value));
            setLines(lines.map((l) => ({ ...l, unitPrice: priceOf(products.find((p) => p.id === l.productId), c) })));
          }}>
            <option value={0}>— Chọn khách —</option>
            {customers.map((c) => <option key={c.id} value={c.id}>{c.name} ({c.channel})</option>)}
          </select>
        </label>
        <label><span className="label">Mã đơn trên sàn (nếu có)</span><input className="input" placeholder="vd: 2603175103271" value={externalRef} onChange={(e) => setExternalRef(e.target.value)} /></label>
        <label><span className="label">Ghi chú</span><input className="input" placeholder="Giao giờ hành chính, gọi trước 30 phút…" value={note} onChange={(e) => setNote(e.target.value)} /></label>
      </div>
      {cust && <p className="text-xs text-slate-500">Kênh: <b>{cust.channel}</b> → áp dụng {cust.wholesale ? "giá sỉ" : "giá lẻ"}</p>}

      <fieldset className="rounded-md border border-line px-4 pb-4 pt-2">
        <legend className="px-1 text-xs font-semibold uppercase tracking-[0.12em] text-slate-500">Giao hàng {cust && !cust.wholesale && "· thông tin đơn sàn"}</legend>
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          <label><span className="label">Purchase order# (sàn)</span><input className="input" placeholder="vd: 129027016008027" value={ship.poNumber} onChange={(e) => setShip({ ...ship, poNumber: e.target.value })} /></label>
          <label><span className="label">Hạn giao (Ship by)</span><input className="input" type="date" value={ship.shipBy} onChange={(e) => setShip({ ...ship, shipBy: e.target.value })} /></label>
          <label><span className="label">Phương thức giao</span>
            <select className="input" value={ship.shipMethod} onChange={(e) => setShip({ ...ship, shipMethod: e.target.value })}>
              <option value="">— Không chọn —</option>{["Standard", "Express", "Freight", "Tự giao"].map((m) => <option key={m} value={m}>{m}</option>)}
            </select>
          </label>
          <label><span className="label">Hãng vận chuyển</span><input className="input" placeholder="vd: FedEx, UPS, USPS…" value={ship.carrier} onChange={(e) => setShip({ ...ship, carrier: e.target.value })} /></label>
        </div>
      </fieldset>

      <div className="table-scroll -mx-5 px-5"><table className="tbl">
        <thead><tr><th className="min-w-64">Sản phẩm</th><th className="w-24">SL (thùng)</th><th className="w-32">Đơn giá ($)</th><th className="w-28 text-right">Thành tiền</th><th className="w-8"></th></tr></thead>
        <tbody>
          {lines.map((l, i) => {
            const p = products.find((x) => x.id === l.productId);
            return (
              <tr key={i}>
                <td>
                  <select className="input" value={l.productId} onChange={(e) => { const np = products.find((x) => x.id === Number(e.target.value)); set(i, { productId: Number(e.target.value), unitPrice: priceOf(np) }); }}>
                    <option value={0}>— Chọn sản phẩm —</option>
                    {products.map((p) => <option key={p.id} value={p.id}>{p.code} – {p.name} (tồn {p.stock})</option>)}
                  </select>
                  {p && l.qty > p.stock && <div className="mt-1 flex items-center gap-1 text-xs text-amber-800"><TriangleAlert aria-hidden size={12} className="shrink-0" />Vượt tồn hiện tại ({p.stock}) – sẽ không xác nhận được đơn</div>}
                </td>
                <td><input className="input" type="number" min={1} placeholder="SL" aria-label="Số lượng (thùng)" value={l.qty} onChange={(e) => set(i, { qty: Number(e.target.value) })} /></td>
                <td><input className="input" type="number" step="0.01" placeholder="0.00" aria-label="Đơn giá ($/thùng)" value={l.unitPrice / 100} onChange={(e) => set(i, { unitPrice: Math.round(Number(e.target.value) * 100) })} /></td>
                <td className="text-right">{money(l.qty * l.unitPrice)}</td>
                <td><button className="cursor-pointer text-red-600" aria-label="Xóa dòng" onClick={() => setLines(lines.filter((_, j) => j !== i))}><X size={16} /></button></td>
              </tr>
            );
          })}
        </tbody>
      </table></div>
      <button className="btn-ghost" onClick={() => setLines([...lines, { productId: 0, qty: 1, unitPrice: 0 }])}>+ Thêm dòng</button>

      <div className="flex flex-wrap items-center justify-end gap-x-4 gap-y-2 border-t border-line pt-3 max-sm:[&>button]:w-full">
        {error && <span className="text-red-600">{error}</span>}
        <span className="text-lg">Tổng: <b>{money(total)}</b></span>
        <button className="btn" disabled={pending} onClick={submit}>{pending ? "Đang lưu…" : "Lưu đơn (Nháp)"}</button>
      </div>
    </div>
  );
}
