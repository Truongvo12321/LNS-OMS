"use client";
import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Plus, X } from "lucide-react";
import { createSlip } from "@/lib/actions";
import { CloseModal } from "@/components/client";

type P = { id: number; code: string; name: string; spec: string | null; unitsPerCarton: number; stock: number };
type L = { productId: number; pallets: number; cartons: number; units: number };
const blank = (): L => ({ productId: 0, pallets: 0, cartons: 0, units: 0 });
const TYPES = [["IN", "Nhập kho"], ["OUT", "Xuất kho (ngoài đơn hàng)"], ["DAMAGED", "Hàng hủy (hỏng / hết hạn / móp)"]];

/** Phiếu nhập / xuất nhiều dòng theo mẫu INVENTORY IN/OUT MONITOR: nhập ghi pallet + thùng, xuất ghi thùng + lẻ. */
export default function SlipForm({ products, defaultProductId }: { products: P[]; defaultProductId?: number }) {
  const router = useRouter();
  const [type, setType] = useState("IN");
  const [date, setDate] = useState(() => new Date().toISOString().slice(0, 10));
  const [note, setNote] = useState("");
  const [lines, setLines] = useState<L[]>([{ ...blank(), productId: defaultProductId ?? 0 }]);
  const [error, setError] = useState("");
  const [pending, start] = useTransition();
  const isIn = type === "IN";
  const set = (i: number, patch: Partial<L>) => setLines(lines.map((l, j) => (j === i ? { ...l, ...patch } : l)));
  const sum = (k: keyof L) => lines.reduce((s, l) => s + (Number(l[k]) || 0), 0);

  const submit = () => start(async () => {
    setError("");
    const r = await createSlip({ type, date, note, lines });
    if ("error" in r) setError(r.error ?? "Lỗi");
    else router.push(`/inventory/slips/${r.id}`);
  });
  const numCell = (i: number, k: "pallets" | "cartons" | "units", label: string) => (
    <td><input className="input text-right" type="number" min={0} placeholder="0" aria-label={label} value={lines[i][k] || ""} onChange={(e) => set(i, { [k]: Number(e.target.value) })} /></td>
  );

  return (
    <div className="space-y-4">
      <div className="grid gap-3 sm:grid-cols-[1fr_10rem]">
        <label className="block"><span className="label">Loại phiếu</span>
          <select className="input" value={type} onChange={(e) => setType(e.target.value)}>{TYPES.map(([v, t]) => <option key={v} value={v}>{t}</option>)}</select>
        </label>
        <label className="block"><span className="label">Ngày</span><input className="input" type="date" value={date} onChange={(e) => setDate(e.target.value)} /></label>
      </div>

      <div className="overflow-x-auto rounded-md border border-line">
        <table className="tbl">
          <thead><tr>
            <th className="w-8">#</th><th>Hàng hóa</th><th className="w-24 text-right">Đơn vị/thùng</th>
            {isIn && <th className="w-24 text-right">Pallet</th>}
            <th className="w-24 text-right">Thùng</th>
            {!isIn && <th className="w-24 text-right">Lẻ</th>}
            <th className="w-10"><span className="sr-only">Xóa dòng</span></th>
          </tr></thead>
          <tbody>
            {lines.map((l, i) => {
              const p = products.find((x) => x.id === l.productId);
              return (
                <tr key={i}>
                  <td className="font-mono text-xs text-slate-400">{i + 1}</td>
                  <td className="min-w-64">
                    <select className="input" aria-label={`Hàng hóa dòng ${i + 1}`} value={l.productId} onChange={(e) => set(i, { productId: Number(e.target.value) })}>
                      <option value={0}>— Chọn hàng —</option>
                      {products.map((p) => <option key={p.id} value={p.id}>{p.code} – {p.name} (tồn {p.stock})</option>)}
                    </select>
                    {p?.spec && <div className="mt-1 text-xs text-slate-500">Quy cách: {p.spec}</div>}
                  </td>
                  <td className="text-right text-slate-600">{p?.unitsPerCarton ?? "—"}</td>
                  {isIn && numCell(i, "pallets", `Pallet dòng ${i + 1}`)}
                  {numCell(i, "cartons", `Thùng dòng ${i + 1}`)}
                  {!isIn && numCell(i, "units", `Lẻ dòng ${i + 1}`)}
                  <td><button type="button" aria-label={`Xóa dòng ${i + 1}`} disabled={lines.length === 1} onClick={() => setLines(lines.filter((_, j) => j !== i))} className="grid size-8 cursor-pointer place-items-center rounded-md text-slate-400 hover:bg-red-50 hover:text-red-600 disabled:cursor-not-allowed disabled:opacity-30"><X aria-hidden size={16} /></button></td>
                </tr>
              );
            })}
            <tr className="border-t-2 border-ink/20 hover:bg-transparent">
              <td colSpan={3} className="text-right text-xs font-semibold uppercase tracking-[0.12em] text-slate-500">Tổng</td>
              {isIn && <td className="text-right font-semibold tabular-nums">{sum("pallets")}</td>}
              <td className="text-right font-semibold tabular-nums">{sum("cartons")}</td>
              {!isIn && <td className="text-right font-semibold tabular-nums">{sum("units")}</td>}
              <td />
            </tr>
          </tbody>
        </table>
      </div>
      <button type="button" className="btn-ghost" onClick={() => setLines([...lines, blank()])}><Plus aria-hidden size={16} />Thêm dòng</button>

      <label className="block"><span className="label">Ghi chú / lý do</span><input className="input" value={note} onChange={(e) => setNote(e.target.value)} placeholder={isIn ? "vd: Nhập container tháng 6" : "vd: Hàng móp, hết hạn 12/2026…"} /></label>
      <p className="text-xs text-slate-500">Phiếu được lưu ở trạng thái <b>Chờ duyệt</b>; tồn kho chỉ thay đổi khi người có quyền duyệt phiếu. Xuất theo đơn hàng được ghi tự động khi xác nhận đơn.</p>

      <div className="flex items-center justify-end gap-2 border-t border-line pt-4">
        {error && <span role="alert" className="mr-auto text-red-700">{error}</span>}
        <CloseModal /><button type="button" className="btn" disabled={pending} onClick={submit}>{pending ? "Đang lưu…" : "Lưu phiếu"}</button>
      </div>
    </div>
  );
}
