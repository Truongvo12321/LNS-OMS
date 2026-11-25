import { Can } from "@/lib/me";
import Link from "next/link";
import { Plus, ArrowRight, TriangleAlert } from "lucide-react";
import { alive, db, money, stockMap } from "@/lib/db";
import { Flash } from "@/components/ui";

export const dynamic = "force-dynamic";

const dmy = (d: Date) => d.toLocaleDateString("vi-VN", { day: "2-digit", month: "2-digit", year: "numeric" });

export default async function Dashboard({ searchParams }: { searchParams: Promise<Record<string, string>> }) {
  const sp = await searchParams;
  const now = new Date(), since = new Date(now.getTime() - 30 * 86400000);
  const sold = { status: { in: ["CONFIRMED", "DELIVERED"] }, createdAt: { gte: since } };
  const [byChannel, channels, items, products, stock, counts] = await Promise.all([
    db.order.groupBy({ by: ["channelId"], where: sold, _sum: { total: true }, _count: true }),
    db.channel.findMany({ orderBy: { id: "asc" } }),
    db.orderItem.findMany({ where: { order: sold }, include: { product: true } }),
    db.product.findMany({ where: alive, orderBy: { code: "asc" } }),
    stockMap(),
    db.order.groupBy({ by: ["status"], _count: true }),
  ]);

  const revenue = byChannel.reduce((s, r) => s + (r._sum.total ?? 0), 0);
  const orderCount = byChannel.reduce((s, r) => s + r._count, 0);
  const rows = channels.map((c) => { const r = byChannel.find((x) => x.channelId === c.id); return { c, v: r?._sum.total ?? 0, n: r?._count ?? 0 }; }).sort((a, b) => b.v - a.v);
  const maxCh = Math.max(1, ...rows.map((r) => r.v));
  const top = [...Map.groupBy(items, (i) => i.productId).values()]
    .map((its) => ({ p: its[0].product, qty: its.reduce((s, i) => s + i.qty, 0), amount: its.reduce((s, i) => s + i.qty * i.unitPrice, 0) }))
    .sort((a, b) => b.amount - a.amount).slice(0, 5);
  // Hàng sắp hết: sắp theo mức nguy cấp (tồn / tối thiểu thấp nhất lên đầu)
  const low = products.map((p) => ({ p, s: stock.get(p.id) ?? 0 })).filter(({ p, s }) => s <= p.minStock)
    .sort((a, b) => a.s / Math.max(1, a.p.minStock) - b.s / Math.max(1, b.p.minStock));
  const count = (s: string) => counts.find((c) => c.status === s)?._count ?? 0;
  const pct = (v: number) => (revenue ? Math.round((v / revenue) * 100) : 0);

  return (
    <div className="space-y-5">
      <div className="page-head items-end justify-between">
        <div>
          <h1 className="h1 mb-1">Tổng quan</h1>
          <p className="text-slate-500">30 ngày gần nhất · <span className="tabular-nums">{dmy(since)} – {dmy(now)}</span></p>
        </div>
        <Can perm="orders.manage"><Link href="/orders/new" className="btn"><Plus aria-hidden size={16} />Tạo đơn hàng</Link></Can>
      </div>
      <Flash sp={sp} />

      {/* Dải chỉ số: một khối, 4 ô ngăn bằng đường kẻ – số là nhân vật chính, không icon trang trí */}
      <section aria-label="Chỉ số chính" className="grid overflow-hidden rounded-lg border border-line bg-white sm:grid-cols-2 xl:grid-cols-4">
        <Kpi label="Doanh thu" value={money(revenue)} note={`${orderCount} đơn đã xác nhận / đã giao`} />
        <Kpi label="Đơn nháp" value={count("DRAFT")} note="Chờ xác nhận" href="/orders?status=DRAFT" />
        <Kpi label="Chờ giao" value={count("CONFIRMED")} note="Đã xác nhận, chưa giao" href="/orders?status=CONFIRMED" />
        <Kpi label="Sắp hết hàng" value={low.length} href="/inventory" warn={low.length > 0}
          note={low.length ? <span className="inline-flex items-center gap-1 font-medium text-amber-800"><TriangleAlert aria-hidden size={13} />Dưới mức tồn tối thiểu</span> : "Tất cả đủ tồn"} />
      </section>

      <div className="grid gap-5 lg:grid-cols-2">
        <section className="card">
          <Head title="Doanh thu theo kênh" aside={<span className="tabular-nums">{money(revenue)}</span>} />
          <ol className="space-y-3.5">
            {rows.map(({ c, v, n }, i) => (
              <li key={c.id} title={`${c.name}: ${money(v)} · ${n} đơn · ${pct(v)}% doanh thu`}>
                <div className="mb-1.5 flex items-baseline gap-3">
                  <span className="w-5 font-mono text-[11px] text-slate-400">{String(i + 1).padStart(2, "0")}</span>
                  <span className="font-medium text-ink">{c.name}</span>
                  <span className="text-xs text-slate-500">{n} đơn</span>
                  <span className="ml-auto text-xs tabular-nums text-slate-500">{pct(v)}%</span>
                  <span className="w-24 text-right font-semibold tabular-nums text-ink">{money(v)}</span>
                </div>
                <div className="ml-8 h-1.5 rounded-full bg-muted">
                  <div className="h-1.5 rounded-full bg-brand-600" style={{ width: `${Math.max(v ? 2 : 0, (v / maxCh) * 100)}%` }} />
                </div>
              </li>
            ))}
          </ol>
        </section>

        <section className="card p-0">
          <div className="px-5 pt-5"><Head title="Bán chạy nhất" aside="Theo doanh thu" /></div>
          <div className="table-scroll"><table className="tbl">
            <thead><tr><th className="w-10">#</th><th>Sản phẩm</th><th className="text-right">SL (thùng)</th><th className="text-right">Doanh thu</th></tr></thead>
            <tbody>
              {top.map(({ p, qty, amount }, i) => (
                <tr key={p.id}>
                  <td className="font-mono text-xs text-slate-400">{String(i + 1).padStart(2, "0")}</td>
                  <td><div className="text-ink">{p.name}</div><div className="font-mono text-xs text-slate-500">{p.code}</div></td>
                  <td className="text-right">{qty}</td>
                  <td className="text-right font-semibold text-ink">{money(amount)}</td>
                </tr>
              ))}
            </tbody>
          </table></div>
          {!top.length && <p className="px-5 pb-5 text-slate-500">Chưa có đơn nào trong 30 ngày.</p>}
        </section>
      </div>

      <section className="card p-0">
        <div className="flex flex-wrap items-center gap-3 px-5 pt-5">
          <div className="mr-auto"><Head title="Hàng sắp hết" aside={low.length ? `${low.length} sản phẩm` : undefined} /></div>
          {low.length > 0 && <Can perm="purchase_orders.view"><Link href="/purchase-orders" className="btn-ghost -mt-3">Lập đơn nhập hàng<ArrowRight aria-hidden size={15} /></Link></Can>}
        </div>
        {low.length ? (
          <div className="table-scroll"><table className="tbl">
            <thead><tr><th>Sản phẩm</th><th className="w-56 min-w-32">Tồn / tối thiểu</th><th className="text-right">Tồn</th><th className="text-right">Tối thiểu</th><th className="text-right">Thiếu</th></tr></thead>
            <tbody>
              {low.map(({ p, s }) => (
                <tr key={p.id}>
                  <td><Link href={`/inventory?tab=history&productId=${p.id}`} className="text-ink hover:underline">{p.name}</Link><div className="font-mono text-xs text-slate-500">{p.code}</div></td>
                  <td>
                    <div className="h-1.5 rounded-full bg-muted" role="meter" aria-valuemin={0} aria-valuemax={p.minStock} aria-valuenow={s} aria-label={`Tồn ${s} / tối thiểu ${p.minStock}`}>
                      <div className="h-1.5 rounded-full bg-amber-500" style={{ width: `${Math.max(s ? 3 : 0, (s / Math.max(1, p.minStock)) * 100)}%` }} />
                    </div>
                  </td>
                  <td className="text-right font-semibold text-red-700">{s}</td>
                  <td className="text-right">{p.minStock}</td>
                  <td className="text-right font-medium text-ink">{p.minStock - s > 0 ? `−${p.minStock - s}` : "0"}</td>
                </tr>
              ))}
            </tbody>
          </table></div>
        ) : <p className="px-5 pb-5 text-slate-500">Tất cả sản phẩm đều đủ tồn.</p>}
      </section>
    </div>
  );
}

function Head({ title, aside }: { title: string; aside?: React.ReactNode }) {
  return (
    <div className="mb-4 flex items-baseline justify-between gap-3 border-b border-line pb-3">
      <h2 className="font-semibold text-ink">{title}</h2>
      {aside && <span className="text-xs text-slate-500">{aside}</span>}
    </div>
  );
}

function Kpi({ label, value, note, href, warn }: { label: string; value: React.ReactNode; note: React.ReactNode; href?: string; warn?: boolean }) {
  const body = (
    <>
      <div className="flex items-center justify-between text-[11px] font-semibold uppercase tracking-[0.12em] text-slate-500">
        {label}{href && <ArrowRight aria-hidden size={14} className="text-slate-300 transition-colors duration-150 group-hover:text-brand-700" />}
      </div>
      <div className={`mt-2 text-[1.75rem] font-semibold leading-none tracking-tight tabular-nums ${warn ? "text-amber-800" : "text-ink"}`}>{value}</div>
      <div className="mt-2 text-xs text-slate-500">{note}</div>
    </>
  );
  // Đường kẻ ngăn ô: dọc ở màn rộng, ngang khi xếp chồng
  const cls = `group relative block border-line p-5 [&:not(:first-child)]:border-t sm:[&:nth-child(2n)]:border-l sm:[&:nth-child(-n+2)]:border-t-0 xl:[&:not(:first-child)]:border-l xl:border-t-0! ${warn ? "bg-amber-50/50" : ""}`;
  return href ? <Link href={href} className={`${cls} transition-colors duration-150 hover:bg-bg`}>{body}</Link> : <div className={cls}>{body}</div>;
}
