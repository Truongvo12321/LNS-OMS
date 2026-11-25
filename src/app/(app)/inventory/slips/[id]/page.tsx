import { Can } from "@/lib/me";
import { notFound } from "next/navigation";
import { Check, X } from "lucide-react";
import { db, guardPage } from "@/lib/db";
import { approveSlip, rejectSlip } from "@/lib/actions";
import { Badge, DocHead, Flash, MetaStrip } from "@/components/ui";
import { ConfirmButton } from "@/components/client";
import PrintButton from "@/app/invoice/[id]/PrintButton";

export const dynamic = "force-dynamic";

const TYPE_LABEL: Record<string, string> = { IN: "Phiếu nhập kho", OUT: "Phiếu xuất kho", DAMAGED: "Phiếu hàng hủy" };
const SLIP_STATUS: Record<string, [string, string]> = { PENDING: ["Chờ duyệt", "DRAFT"], APPROVED: ["Đã duyệt", "DELIVERED"], REJECTED: ["Từ chối", "CANCELLED"] };
const d = (x: Date) => x.toLocaleDateString("vi-VN", { day: "2-digit", month: "2-digit", year: "numeric" });

export default async function SlipDetail({ params, searchParams }: { params: Promise<{ id: string }>; searchParams: Promise<Record<string, string>> }) {
  await guardPage("inventory.view");
  const [{ id }, sp] = await Promise.all([params, searchParams]);
  const slip = await db.stockSlip.findUnique({ where: { id: Number(id) }, include: { lines: { include: { product: true }, orderBy: { id: "asc" } }, createdBy: true, approvedBy: true } });
  if (!slip) notFound();
  const isIn = slip.type === "IN";
  const [statusLabel, statusTone] = SLIP_STATUS[slip.status];
  const tot = (k: "pallets" | "cartons" | "units") => slip.lines.reduce((s, l) => s + l[k], 0);
  const rows = Math.max(slip.lines.length, 8); // mẫu giấy luôn có sẵn dòng trống

  return (
    <div className="space-y-5">
      <div className="no-print space-y-5">
        <DocHead back="/inventory?tab=slips" backLabel="Phiếu kho" code={slip.code} status={<Badge v={statusTone} label={statusLabel} />}>
          <PrintButton />
          {slip.status === "PENDING" && <Can perm="inventory.approve">
            <form action={rejectSlip}><input type="hidden" name="id" value={slip.id} />
              <ConfirmButton className="btn-red" title="Từ chối phiếu?" confirmLabel="Từ chối" message={<>Phiếu <b>{slip.code}</b> sẽ không được ghi vào kho.</>}><X aria-hidden size={16} />Từ chối</ConfirmButton>
            </form>
            <form action={approveSlip}><input type="hidden" name="id" value={slip.id} /><button className="btn"><Check aria-hidden size={16} />Duyệt &amp; ghi kho</button></form>
          </Can>}
        </DocHead>
        <Flash sp={sp} />
        <MetaStrip items={[
          { label: "Loại phiếu", value: TYPE_LABEL[slip.type] },
          { label: "Ngày", value: <span className="tabular-nums">{d(slip.date)}</span>, sub: slip.note ?? undefined },
          { label: "Người lập", value: slip.createdBy?.name ?? "—" },
          { label: "Người duyệt", value: slip.approvedBy?.name ?? <span className="text-slate-500">Chưa duyệt</span>, sub: slip.approvedAt ? d(slip.approvedAt) : undefined },
        ]} />
      </div>

      {/* Bản in theo mẫu INVENTORY IN/OUT MONITOR của kho */}
      <section className="slip-sheet mx-auto max-w-4xl overflow-x-auto bg-white p-4 text-[13px] text-black sm:p-6 print:max-w-none print:overflow-visible print:p-0">
        <h2 className="mb-3 text-center text-xl font-bold uppercase tracking-wide">Inventory In/Out Monitor</h2>
        <table className="w-full min-w-[40rem] border-collapse [&_td]:border [&_td]:border-black [&_td]:px-2 [&_td]:py-1 [&_th]:border [&_th]:border-black [&_th]:px-2 [&_th]:py-1">
          <thead>
            <tr><th colSpan={2} className="text-left">APPROVED BY: {slip.approvedBy?.name ?? "………………"}</th><th colSpan={2} className="text-left">DATE: {d(slip.date)}</th><th colSpan={4} className="text-left">{slip.code} · {TYPE_LABEL[slip.type]}</th></tr>
            <tr><th rowSpan={2} className="w-12">NO.</th><th rowSpan={2}>DESCRIPTION OF GOODS</th><th colSpan={2}>SPECIFICATION</th><th colSpan={2}>IN</th><th colSpan={2}>OUT</th></tr>
            <tr><th className="w-20">UNIT</th><th className="w-20">UNIT/ CARTON</th><th className="w-16">PALLET</th><th className="w-16">CARTON</th><th className="w-16">UNIT</th><th className="w-16">CARTON</th></tr>
          </thead>
          <tbody>
            {Array.from({ length: rows }, (_, i) => {
              const l = slip.lines[i];
              return (
                <tr key={i} className="h-7">
                  <td className="text-center">{i + 1}</td>
                  <td className="uppercase">{l && `${l.product.name}`}</td>
                  <td className="text-center">{l?.product.spec}</td>
                  <td className="text-center">{l?.product.unitsPerCarton}</td>
                  <td className="text-center">{l && isIn ? l.pallets || "" : ""}</td>
                  <td className="text-center">{l && isIn ? l.cartons || "" : ""}</td>
                  <td className="text-center">{l && !isIn ? l.units || "" : ""}</td>
                  <td className="text-center">{l && !isIn ? l.cartons || "" : ""}</td>
                </tr>
              );
            })}
            <tr className="h-10 font-bold">
              <td colSpan={4} className="text-center">TOTAL</td>
              <td className="text-center">{isIn ? tot("pallets") : "-"}</td><td className="text-center">{isIn ? tot("cartons") : "-"}</td>
              <td className="text-center">{isIn ? "-" : tot("units")}</td><td className="text-center">{isIn ? "-" : tot("cartons")}</td>
            </tr>
          </tbody>
        </table>
      </section>
    </div>
  );
}
