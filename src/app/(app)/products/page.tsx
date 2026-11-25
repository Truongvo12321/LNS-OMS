import { Can } from "@/lib/me";
import { alive, db, guardPage } from "@/lib/db";
import { can } from "@/lib/perms";
import { saveProduct } from "@/lib/actions";
import { Flash } from "@/components/ui";
import { CloseModal, FormModal } from "@/components/client";
import ProductList from "./List";
import ImageInput from "./ImageInput";

export const dynamic = "force-dynamic";

export default async function Products({ searchParams }: { searchParams: Promise<Record<string, string>> }) {
  const me = await guardPage("products.view");
  const sp = await searchParams;
  const canManage = can(me, "products.manage");
  const edit = canManage && sp.edit ? await db.product.findFirst({ where: { id: Number(sp.edit), ...alive } }) : null;
  const f = (n: number | undefined) => (n == null ? "" : n / 100);

  return (
    <div>
      <div className="page-head mb-4">
        <h1 className="h1 mb-0 mr-auto">Sản phẩm</h1>
        <Can perm="products.manage">
        <FormModal trigger="Thêm sản phẩm" title={edit ? `Sửa sản phẩm ${edit.code}` : "Thêm sản phẩm"} open={!!edit}>
          <form action={saveProduct} className="space-y-3" key={edit?.id ?? "new"}>
            <input type="hidden" name="id" value={edit?.id ?? 0} />
            <div className="grid gap-3 sm:grid-cols-2">
              <Field label="Mã SP *" name="code" v={edit?.code} required ph="vd: LNS003" />
              <Field label="Thương hiệu" name="brand" v={edit?.brand} ph="vd: Richy" />
            </div>
            <Field label="Tên (tiếng Anh, in trên hoá đơn) *" name="name" v={edit?.name} required ph="vd: Cooling Herbal Tea" />
            <Field label="Tên tiếng Việt" name="nameVi" v={edit?.nameVi} ph="vd: Nước mát Sài Gòn" />
            <Field label="Mã trên sàn (Item Number / SKU)" name="marketSku" v={edit?.marketSku} ph="vd: 17885508381" />
            <ImageInput current={edit?.imageType ? `/api/product-image/${edit.id}?v=${edit.imageVer}` : undefined} />
            <Field label="Quy cách" name="spec" v={edit?.spec} ph="vd: 320ML x 24" />
            <div className="grid grid-cols-2 gap-3">
              <Field label="Đơn vị / thùng" name="unitsPerCarton" type="number" v={edit?.unitsPerCarton ?? 1} ph="vd: 24" />
              <Field label="Tồn tối thiểu (thùng)" name="minStock" type="number" v={edit?.minStock ?? 0} ph="vd: 30" />
              <Field label="Giá sỉ ($/thùng)" name="wholesalePrice" type="number" v={f(edit?.wholesalePrice)} ph="0.00" />
              <Field label="Giá lẻ ($/thùng)" name="retailPrice" type="number" v={f(edit?.retailPrice)} ph="0.00" />
            </div>
            <p className="text-xs text-slate-500">Tồn kho không sửa ở đây – chỉ thay đổi qua phiếu kho / đơn hàng.</p>
            <div className="flex justify-end gap-2 border-t border-line pt-4"><CloseModal /><button className="btn">Lưu</button></div>
          </form>
        </FormModal>
        </Can>
      </div>
      <Flash sp={sp} />
      <ProductList rev={Date.now()} />
    </div>
  );
}

function Field({ label, name, v, type = "text", required, ph }: { label: string; name: string; v?: string | number | null; type?: string; required?: boolean; ph?: string }) {
  return <label className="block"><span className="label">{label}</span><input className="input" name={name} type={type} step="any" required={required} placeholder={ph} defaultValue={v ?? ""} /></label>;
}
