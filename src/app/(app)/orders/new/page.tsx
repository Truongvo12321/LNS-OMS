import { alive, db, stockMap, guardPage } from "@/lib/db";
import OrderForm from "./OrderForm";
import { Flash } from "@/components/ui";

export const dynamic = "force-dynamic";

export default async function NewOrder({ searchParams }: { searchParams: Promise<Record<string, string>> }) {
  await guardPage("orders.manage");
  const sp = await searchParams;
  const [customers, products, stock] = await Promise.all([
    db.customer.findMany({ where: alive, include: { channel: true }, orderBy: { name: "asc" } }),
    db.product.findMany({ where: alive, orderBy: { code: "asc" } }),
    stockMap(),
  ]);
  return (
    <div>
      <h1 className="h1">Tạo đơn hàng</h1>
      <Flash sp={{ err: sp.err }} />
      <OrderForm
        defaultCustomerId={Number(sp.customerId) || 0}
        customers={customers.map((c) => ({ id: c.id, name: c.name, channel: c.channel.name, wholesale: c.channel.type === "WHOLESALE" }))}
        products={products.map((p) => ({ id: p.id, code: p.code, name: p.name, wholesalePrice: p.wholesalePrice, retailPrice: p.retailPrice, stock: stock.get(p.id) ?? 0 }))}
      />
    </div>
  );
}
