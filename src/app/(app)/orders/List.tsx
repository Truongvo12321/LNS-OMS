"use client";
import Link from "next/link";
import { useList } from "@/lib/query";
import { money, fdate, STATUS_LABEL } from "@/lib/format";
import { Badge } from "@/components/ui";
import { FilterSelect, ListState, Pagination, SearchBox } from "@/components/client";

type Row = { id: number; code: string; createdAt: string; shipBy: string | null; externalRef: string | null; total: number; status: string; customer: { name: string }; channel: { name: string } };

export default function OrderList({ channels, rev }: { channels: [number, string][]; rev: number }) {
  const q = useList<Row>("orders", ["q", "status", "channelId"], { rev });
  return (
    <>
      <div className="filters mb-3">
        <SearchBox placeholder="Mã đơn / mã sàn / khách…" />
        <FilterSelect name="status" label="Mọi trạng thái" className="w-44" options={["DRAFT", "CONFIRMED", "DELIVERED", "CANCELLED"].map((s) => [s, STATUS_LABEL[s]])} />
        <FilterSelect name="channelId" label="Mọi kênh" className="w-48" options={channels} />
      </div>
      <div className="card overflow-hidden p-0">
        <div className="overflow-x-auto">
          <table className="tbl">
            <thead><tr><th>Mã đơn</th><th>Ngày</th><th>Khách hàng</th><th>Kênh</th><th>Mã sàn</th><th>Hạn giao</th><th className="text-right">Tổng</th><th className="text-center">Trạng thái</th></tr></thead>
            <tbody>
              {q.data?.rows.map((o) => (
                <tr key={o.id}>
                  <td><Link className="link font-mono" href={`/orders/${o.id}`}>{o.code}</Link></td>
                  <td className="whitespace-nowrap">{fdate(o.createdAt)}</td><td>{o.customer.name}</td><td>{o.channel.name}</td><td className="font-mono text-xs">{o.externalRef}</td>
                  <td className="whitespace-nowrap tabular-nums">{o.shipBy ? <ShipBy d={o.shipBy} open={["DRAFT", "CONFIRMED"].includes(o.status)} /> : <span className="text-slate-300">—</span>}</td>
                  <td className="text-right">{money(o.total)}</td><td className="text-center"><Badge v={o.status} /></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <ListState q={q} empty="Không có đơn nào." />
        <Pagination data={q.data} fetching={q.isFetching} />
      </div>
    </>
  );
}

/** Hạn giao; đơn chưa giao mà quá hạn → đỏ + chữ "Trễ" (không chỉ dựa vào màu). */
function ShipBy({ d, open }: { d: string; open: boolean }) {
  const date = new Date(d), late = open && date < new Date(new Date().toDateString());
  return <span className={late ? "font-medium text-red-700" : ""}>{date.toLocaleDateString("vi-VN")}{late && " · Trễ"}</span>;
}
