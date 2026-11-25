import { Can } from "@/lib/me";
import { Boxes, CalendarDays, ClipboardList, History } from "lucide-react";
import { alive, db, guardPage, stockMap } from "@/lib/db";
import { Flash } from "@/components/ui";
import { FormModal, Tabs } from "@/components/client";
import { MovementList, SlipList, StockList } from "./List";
import SlipForm from "./SlipForm";
import Matrix from "./Matrix";

export const dynamic = "force-dynamic";

export default async function Inventory({ searchParams }: { searchParams: Promise<Record<string, string>> }) {
  await guardPage("inventory.view");
  const sp = await searchParams;
  const [products, stock] = await Promise.all([db.product.findMany({ where: alive, orderBy: { code: "asc" } }), stockMap()]);
  const rev = Date.now();

  return (
    <div className="space-y-4">
      <div className="page-head">
        <h1 className="h1 mb-0 mr-auto">Kho hàng</h1>
        <Can perm="inventory.manage">
          <FormModal trigger="Lập phiếu kho" title="Lập phiếu nhập / xuất kho" wide>
            <SlipForm defaultProductId={Number(sp.productId) || undefined}
              products={products.map((p) => ({ id: p.id, code: p.code, name: p.name, spec: p.spec, unitsPerCarton: p.unitsPerCarton, stock: stock.get(p.id) ?? 0 }))} />
          </FormModal>
        </Can>
      </div>
      <Flash sp={sp} />
      <Tabs tabs={[
        { key: "stock", label: <><Boxes aria-hidden size={16} />Tồn kho</>, content: <StockList rev={rev} /> },
        { key: "slips", label: <><ClipboardList aria-hidden size={16} />Phiếu kho</>, content: <SlipList rev={rev} /> },
        { key: "history", label: <><History aria-hidden size={16} />Lịch sử xuất nhập</>, content: <MovementList products={products.map((p) => [p.id, p.code])} rev={rev} /> },
        { key: "matrix", label: <><CalendarDays aria-hidden size={16} />Bảng theo ngày</>, content: <Matrix days={sp.mdays} query={new URLSearchParams(sp)} /> },
      ]} />
    </div>
  );
}
