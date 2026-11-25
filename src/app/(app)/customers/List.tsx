"use client";
import { useCan } from "@/lib/me";
import { Pencil, ShoppingCart, Trash2 } from "lucide-react";
import { useList, useUrlState } from "@/lib/query";
import { deleteCustomer } from "@/lib/actions";
import { FilterSelect, ListState, Pagination, RowMenu, SearchBox } from "@/components/client";

type Row = { id: number; name: string; phone: string | null; address: string | null; channel: { name: string }; _count: { orders: number } };

export default function CustomerList({ channels, rev }: { channels: [number, string][]; rev: number }) {
  const canManage = useCan("customers.manage");
  const q = useList<Row>("customers", ["q", "channelId"], { rev });
  const { href } = useUrlState();
  return (
    <>
      <div className="filters mb-3">
        <SearchBox placeholder="Tên / điện thoại…" />
        <FilterSelect name="channelId" label="Mọi kênh" className="w-48" options={channels} />
      </div>
      <div className="card overflow-hidden p-0">
        <div className="overflow-x-auto">
          <table className="tbl">
            <thead><tr><th>Tên</th><th>Kênh</th><th>Điện thoại</th><th>Địa chỉ</th><th className="text-right">Số đơn</th><th className="w-24 text-center">Thao tác</th></tr></thead>
            <tbody>
              {q.data?.rows.map((c) => (
                <tr key={c.id}>
                  <td className="font-medium">{c.name}</td><td>{c.channel.name}</td><td>{c.phone}</td><td>{c.address}</td>
                  <td className="text-right">{c._count.orders}</td>
                  <td className="w-14 text-center">
                    <RowMenu label={`Thao tác ${c.name}`} items={[
                      ...(canManage ? [{ label: "Sửa", icon: Pencil, href: href({ edit: c.id, ok: undefined, err: undefined }) }] : []),
                      { label: "Tạo đơn", icon: ShoppingCart, href: `/orders/new?customerId=${c.id}` },
                      ...(canManage ? [{ label: "Xóa", icon: Trash2, action: deleteCustomer, fields: { id: c.id }, danger: true, confirm: {
                        title: "Xóa khách hàng?", confirmLabel: "Xóa",
                        message: <>Khách hàng <b>{c.name}</b> sẽ bị ẩn khỏi danh sách và không chọn được khi tạo đơn mới. {c._count.orders > 0 && `${c._count.orders} đơn cũ vẫn được giữ nguyên.`}</>,
                      } }] : []),
                    ]} />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <ListState q={q} empty="Không có khách hàng nào." />
        <Pagination data={q.data} fetching={q.isFetching} />
      </div>
    </>
  );
}
