import Link from "next/link";
import { CircleAlert, CircleCheck } from "lucide-react";
import { STATUS_LABEL } from "@/lib/format";

// Trạng thái kiểu "dấu" trong sổ: ô vuông màu nhỏ + chữ trung tính (màu không phải kênh duy nhất – luôn có chữ)
const MARK: Record<string, string> = {
  DRAFT: "bg-slate-400", CONFIRMED: "bg-sky-600", DELIVERED: "bg-emerald-600", CANCELLED: "bg-rose-500",
  ORDERED: "bg-sky-600", RECEIVED: "bg-emerald-600",
  IN: "bg-emerald-600", OUT: "bg-sky-600", DAMAGED: "bg-rose-500", RETURN: "bg-amber-500", LOW: "bg-amber-500",
};
export const Badge = ({ v, label }: { v: string; label?: string }) => (
  <span className={`inline-flex items-center gap-1.5 whitespace-nowrap text-[13px] font-medium ${v === "LOW" ? "text-amber-800" : v === "CANCELLED" ? "text-slate-500 line-through decoration-slate-300" : "text-slate-700"}`}>
    <span aria-hidden className={`size-2 rounded-[2px] ${MARK[v] ?? "bg-slate-400"}`} />{label ?? STATUS_LABEL[v] ?? v}
  </span>
);

export const Flash = ({ sp }: { sp: Record<string, string | undefined> }) => (
  <>
    {sp.err && <div role="alert" className="mb-5 flex items-start gap-2 rounded-md border border-rose-200 bg-rose-50 px-4 py-3 text-rose-700"><CircleAlert size={17} className="mt-px shrink-0" />{sp.err}</div>}
    {sp.ok && <div role="status" className="mb-5 flex items-start gap-2 rounded-md border border-emerald-200 bg-emerald-50 px-4 py-3 text-emerald-700"><CircleCheck size={17} className="mt-px shrink-0" />Đã lưu thành công</div>}
  </>
);

/** Dải thông tin của một chứng từ (đơn hàng, đơn nhập): các ô nhãn + giá trị ngăn bằng đường kẻ, thay cho nhiều card rời. */
export const MetaStrip = ({ items }: { items: { label: string; value: React.ReactNode; sub?: React.ReactNode }[] }) => (
  <dl className="grid overflow-hidden rounded-lg border border-line bg-white sm:grid-cols-2 lg:auto-cols-fr lg:grid-flow-col lg:grid-cols-none">
    {items.map((it) => (
      <div key={it.label} className="border-line px-5 py-4 [&:not(:first-child)]:border-t lg:[&:not(:first-child)]:border-t-0 lg:[&:not(:first-child)]:border-l">
        <dt className="text-[11px] font-semibold uppercase tracking-[0.12em] text-slate-500">{it.label}</dt>
        <dd className="mt-1.5 font-medium text-ink">{it.value}</dd>
        {it.sub && <dd className="mt-0.5 text-xs text-slate-500">{it.sub}</dd>}
      </div>
    ))}
  </dl>
);

/** Đầu trang chứng từ: đường dẫn quay lại nhỏ phía trên, mã chứng từ lớn, nút thao tác bên phải. */
export const DocHead = ({ back, backLabel, code, status, children }: { back: string; backLabel: string; code: string; status: React.ReactNode; children?: React.ReactNode }) => (
  <div className="flex flex-wrap items-end gap-3">
    <div className="mr-auto">
      <Link href={back} className="text-xs font-semibold uppercase tracking-[0.12em] text-slate-500 hover:text-ink">← {backLabel}</Link>
      <div className="mt-1 flex items-center gap-3"><h1 className="h1 mb-0 font-mono">{code}</h1>{status}</div>
    </div>
    {children && <div className="flex flex-wrap gap-2">{children}</div>}
  </div>
);
