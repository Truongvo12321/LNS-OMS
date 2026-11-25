import { Can } from "@/lib/me";
import Link from "next/link";
import { Upload, Plus } from "lucide-react";
import { db, guardPage } from "@/lib/db";
import OrderList from "./List";

export const dynamic = "force-dynamic";

export default async function Orders() {
  await guardPage("orders.view");
  const channels = await db.channel.findMany({ orderBy: { id: "asc" } });
  return (
    <div>
      <div className="page-head mb-4">
        <h1 className="h1 mb-0 mr-auto">Đơn hàng</h1>
        <Can perm="orders.manage">
          <Link href="/orders/import" className="btn-ghost"><Upload aria-hidden size={16} />Import CSV từ sàn</Link>
          <Link href="/orders/new" className="btn"><Plus aria-hidden size={16} />Tạo đơn</Link>
        </Can>
      </div>
      <OrderList channels={channels.map((c) => [c.id, c.name])} rev={Date.now()} />
    </div>
  );
}
