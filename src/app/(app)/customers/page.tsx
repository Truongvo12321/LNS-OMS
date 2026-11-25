import { Can } from "@/lib/me";
import { alive, db, guardPage } from "@/lib/db";
import { can } from "@/lib/perms";
import { saveCustomer } from "@/lib/actions";
import { Flash } from "@/components/ui";
import { CloseModal, FormModal } from "@/components/client";
import CustomerList from "./List";

export const dynamic = "force-dynamic";

export default async function Customers({ searchParams }: { searchParams: Promise<Record<string, string>> }) {
  const me = await guardPage("customers.view");
  const sp = await searchParams;
  const canManage = can(me, "customers.manage");
  const [channels, edit] = await Promise.all([
    db.channel.findMany({ orderBy: { id: "asc" } }),
    canManage && sp.edit ? db.customer.findFirst({ where: { id: Number(sp.edit), ...alive } }) : null,
  ]);

  return (
    <div>
      <div className="page-head mb-4">
        <h1 className="h1 mb-0 mr-auto">Khách hàng & kênh bán</h1>
        <Can perm="customers.manage">
        <FormModal trigger="Thêm khách hàng" title={edit ? `Sửa khách hàng ${edit.name}` : "Thêm khách hàng"} open={!!edit}>
          <form action={saveCustomer} className="space-y-3" key={edit?.id ?? "new"}>
            <input type="hidden" name="id" value={edit?.id ?? 0} />
            <label className="block"><span className="label">Tên *</span><input className="input" name="name" required placeholder="vd: Siêu thị Hoà Bình" defaultValue={edit?.name} /></label>
            <div className="grid gap-3 sm:grid-cols-2">
              <label className="block"><span className="label">Kênh bán *</span>
                <select className="input" name="channelId" defaultValue={edit?.channelId}>{channels.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}</select>
              </label>
              <label className="block"><span className="label">Điện thoại</span><input className="input" name="phone" type="tel" placeholder="vd: 0901 234 567" defaultValue={edit?.phone ?? ""} /></label>
            </div>
            <label className="block"><span className="label">Địa chỉ giao hàng (Ship to)</span><input className="input" name="address" placeholder="vd: 12002 Fairpoint Dr, Houston, TX 77099" defaultValue={edit?.address ?? ""} /></label>
            <label className="block"><span className="label">Địa chỉ xuất hoá đơn (Bill to)</span><input className="input" name="billAddress" placeholder="Bỏ trống nếu giống địa chỉ giao hàng" defaultValue={edit?.billAddress ?? ""} /></label>
            <div className="flex justify-end gap-2 border-t border-line pt-4"><CloseModal /><button className="btn">Lưu</button></div>
          </form>
        </FormModal>
        </Can>
      </div>
      <Flash sp={sp} />
      <CustomerList channels={channels.map((c) => [c.id, c.name])} rev={Date.now()} />
    </div>
  );
}
