import Link from "next/link";
import { alive, db, stockDetail } from "@/lib/db";

const RANGES = [7, 30, 90];
const dayKey = (d: Date) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;

/**
 * Bảng xuất nhập theo ngày – thay file Excel của kho: mỗi dòng một sản phẩm, mỗi cột một ngày có phát sinh.
 * Ô = tổng nhập (+) / xuất (−) trong ngày, quy theo thùng; cột "Hàng hủy" cộng dồn trong kỳ.
 */
export default async function Matrix({ days: raw, query }: { days?: string; query: URLSearchParams }) {
  const days = RANGES.includes(Number(raw)) ? Number(raw) : 30;
  const since = new Date(); since.setHours(0, 0, 0, 0); since.setDate(since.getDate() - days + 1);
  const [products, moves, stock] = await Promise.all([
    db.product.findMany({ where: alive, orderBy: { code: "asc" }, select: { id: true, code: true, name: true, unitsPerCarton: true } }),
    db.stockMovement.findMany({ where: { createdAt: { gte: since } }, select: { productId: true, type: true, qty: true, units: true, createdAt: true } }),
    stockDetail(),
  ]);
  const per = new Map(products.map((p) => [p.id, Math.max(1, p.unitsPerCarton)]));
  const cell = new Map<string, { inn: number; out: number }>(); // key `${productId}|${day}`, đơn vị: thùng (có thể lẻ)
  const damaged = new Map<number, number>();
  for (const m of moves) {
    const v = m.qty + m.units / (per.get(m.productId) ?? 1), k = `${m.productId}|${dayKey(m.createdAt)}`;
    const c = cell.get(k) ?? { inn: 0, out: 0 };
    if (v >= 0) c.inn += v; else c.out -= v;
    cell.set(k, c);
    if (m.type === "DAMAGED") damaged.set(m.productId, (damaged.get(m.productId) ?? 0) - v);
  }
  const dates = [...new Set(moves.map((m) => dayKey(m.createdAt)))].sort();
  const fmt = (n: number) => (Number.isInteger(n) ? String(n) : n.toFixed(1));
  const link = (d: number) => { const p = new URLSearchParams(query); p.set("tab", "matrix"); p.set("mdays", String(d)); return `?${p}`; };

  return (
    <section className="card overflow-hidden p-0">
      <div className="flex flex-wrap items-center gap-3 p-4">
        <div className="mr-auto">
          <h2 className="font-semibold text-ink">Xuất nhập theo ngày</h2>
          <p className="text-xs text-slate-500">Đơn vị: thùng · <span className="text-emerald-700">+ nhập</span> / <span className="text-red-700">− xuất</span> · chỉ hiện ngày có phát sinh</p>
        </div>
        <nav aria-label="Khoảng thời gian" className="flex rounded-md border border-line p-0.5">
          {RANGES.map((d) => (
            <Link key={d} href={link(d)} scroll={false} aria-current={d === days ? "true" : undefined}
              className={`rounded px-3 py-1 text-sm transition-colors duration-150 ${d === days ? "bg-ink text-white" : "text-slate-600 hover:bg-muted"}`}>{d} ngày</Link>
          ))}
        </nav>
      </div>
      <div className="overflow-x-auto border-t border-line">
        <table className="tbl text-[13px]">
          <thead>
            <tr>
              <th className="left-0 z-10 sm:sticky bg-white">Mã</th><th className="left-[5.5rem] z-10 sm:sticky min-w-56 bg-white">Sản phẩm</th>
              <th className="text-right">Tồn</th><th className="text-right">Hàng hủy</th>
              {dates.map((d) => <th key={d} className="text-center tabular-nums">{Number(d.slice(8))}/{Number(d.slice(5, 7))}</th>)}
            </tr>
          </thead>
          <tbody>
            {products.map((p) => {
              const s = stock.get(p.id);
              return (
                <tr key={p.id}>
                  <td className="left-0 z-10 sm:sticky w-[5.5rem] bg-white font-mono text-xs">{p.code}</td>
                  <td className="left-[5.5rem] z-10 sm:sticky bg-white"><Link href={`/inventory?tab=history&productId=${p.id}`} className="hover:underline">{p.name}</Link></td>
                  <td className="text-right font-semibold">{s?.cartons ?? 0}{s?.loose ? <span className="text-xs font-normal text-slate-500"> +{s.loose}</span> : null}</td>
                  <td className="text-right text-rose-700">{damaged.get(p.id) ? fmt(damaged.get(p.id)!) : <span className="text-slate-300">·</span>}</td>
                  {dates.map((d) => {
                    const c = cell.get(`${p.id}|${d}`);
                    return (
                      <td key={d} className="border-l border-line text-center tabular-nums">
                        {c ? <>{c.inn > 0 && <div className="text-emerald-700">+{fmt(c.inn)}</div>}{c.out > 0 && <div className="text-red-700">−{fmt(c.out)}</div>}</> : <span className="text-slate-300">·</span>}
                      </td>
                    );
                  })}
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
      {!dates.length && <p className="p-4 text-slate-500">Không có phát sinh trong {days} ngày qua.</p>}
    </section>
  );
}
