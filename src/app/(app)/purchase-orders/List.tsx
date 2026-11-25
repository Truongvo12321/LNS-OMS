"use client";
import Link from "next/link";
import { useList } from "@/lib/query";
import { fdate, STATUS_LABEL } from "@/lib/format";
import { Badge } from "@/components/ui";
import { FilterSelect, ListState, Pagination } from "@/components/client";

type Row = { id: number; code: string; createdAt: string; supplier: string | null; status: string; receivedAt: string | null; _count: { items: number } };

export default function POList({ rev }: { rev: number }) {
  const q = useList<Row>("purchase-orders", ["status"], { rev });
  return (
    <div className="card overflow-hidden p-0">
      <div className="filters items-center p-4">
        <h2 className="mr-auto font-semibold text-ink">Danh sách đơn nhập</h2>
        <FilterSelect name="status" label="Mọi trạng thái" className="w-44" options={["DRAFT", "ORDERED", "RECEIVED", "CANCELLED"].map((s) => [s, STATUS_LABEL[s]])} />
      </div>
      <div className="overflow-x-auto border-t border-line">
        <table className="tbl">
          <thead><tr><th>Mã PO</th><th>Ngày tạo</th><th>Nhà cung cấp</th><th className="text-right">Số mặt hàng</th><th className="text-center">Trạng thái</th><th>Nhận hàng</th></tr></thead>
          <tbody>{q.data?.rows.map((po) => (
            <tr key={po.id}><td><Link className="link font-mono" href={`/purchase-orders/${po.id}`}>{po.code}</Link></td><td className="whitespace-nowrap">{fdate(po.createdAt)}</td><td>{po.supplier}</td><td className="text-right">{po._count.items}</td><td className="text-center"><Badge v={po.status} /></td><td className="whitespace-nowrap">{po.receivedAt && fdate(po.receivedAt)}</td></tr>
          ))}</tbody>
        </table>
      </div>
      <ListState q={q} empty="Chưa có đơn nhập nào." />
      <Pagination data={q.data} fetching={q.isFetching} />
    </div>
  );
}
