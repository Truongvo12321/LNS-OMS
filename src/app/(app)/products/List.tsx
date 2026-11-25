"use client";
import { useCan } from "@/lib/me";
import { History, Package, Pencil, Trash2 } from "lucide-react";
import { useList, useUrlState } from "@/lib/query";
import { money } from "@/lib/format";
import { deleteProduct } from "@/lib/actions";
import { Badge } from "@/components/ui";
import { ListState, Pagination, RowMenu, SearchBox } from "@/components/client";

type Row = { id: number; code: string; name: string; nameVi: string | null; marketSku: string | null; imageType: string | null; imageVer: number; brand: string | null; spec: string | null; wholesalePrice: number; retailPrice: number; minStock: number; stock: number };

export default function ProductList({ rev }: { rev: number }) {
  const canManage = useCan("products.manage");
  const q = useList<Row>("products", ["q"], { rev });
  const { href } = useUrlState();
  return (
    <>
      <div className="filters mb-3"><SearchBox placeholder="Mã, tên, tên tiếng Việt, SKU sàn…" /></div>
      <div className="card overflow-hidden p-0">
        <div className="overflow-x-auto">
          <table className="tbl">
            <thead><tr><th>Mã</th><th>Tên</th><th>Quy cách</th><th className="text-right">Giá sỉ/thùng</th><th className="text-right">Giá lẻ/thùng</th><th className="text-right">Tồn</th><th className="text-right">Tối thiểu</th><th className="w-24 text-center">Thao tác</th></tr></thead>
            <tbody>
              {q.data?.rows.map((p) => (
                <tr key={p.id}>
                  <td className="font-mono">{p.code}</td>
                  <td className="min-w-64">
                    <div className="flex items-center gap-3">
                      <div className="grid size-11 shrink-0 place-items-center overflow-hidden rounded-md border border-line bg-white">
                        {/* eslint-disable-next-line @next/next/no-img-element -- ảnh lưu trong DB qua route có kiểm tra đăng nhập */}
                        {p.imageType ? <img src={`/api/product-image/${p.id}?v=${p.imageVer}`} alt="" loading="lazy" className="size-full object-contain" /> : <Package aria-hidden size={18} className="text-slate-300" />}
                      </div>
                      <div className="min-w-0">
                        <div className="text-ink">{p.name}</div>
                        {p.nameVi && <div className="text-xs text-slate-600">{p.nameVi}</div>}
                        <div className="text-xs text-slate-500">{[p.brand, p.marketSku && `SKU sàn ${p.marketSku}`].filter(Boolean).join(" · ")}</div>
                      </div>
                    </div>
                  </td>
                  <td>{p.spec}</td>
                  <td className="text-right">{money(p.wholesalePrice)}</td>
                  <td className="text-right">{money(p.retailPrice)}</td>
                  <td className="whitespace-nowrap text-right font-semibold">{p.stock <= p.minStock && <Badge v="LOW" label="Sắp hết" />} {p.stock}</td>
                  <td className="text-right">{p.minStock}</td>
                  <td className="w-14 text-center">
                    <RowMenu label={`Thao tác ${p.code}`} items={[
                      ...(canManage ? [{ label: "Sửa", icon: Pencil, href: href({ edit: p.id, ok: undefined, err: undefined }) }] : []),
                      { label: "Thẻ kho", icon: History, href: `/inventory?tab=history&productId=${p.id}` },
                      ...(canManage ? [{ label: "Xóa", icon: Trash2, action: deleteProduct, fields: { id: p.id }, danger: true, confirm: {
                        title: "Xóa sản phẩm?", confirmLabel: "Xóa",
                        message: <>Sản phẩm <b>{p.code} – {p.name}</b> sẽ bị ẩn khỏi catalogue và không bán / nhập được nữa. Lịch sử đơn hàng và thẻ kho vẫn được giữ.</>,
                      } }] : []),
                    ]} />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <ListState q={q} empty="Không có sản phẩm nào." />
        <Pagination data={q.data} fetching={q.isFetching} />
      </div>
    </>
  );
}
