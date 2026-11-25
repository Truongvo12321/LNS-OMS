import { NextResponse, type NextRequest } from "next/server";
import { alive, db, sessionUser, stockDetail } from "@/lib/db";
import { can, type Perm } from "@/lib/perms";

// GET /api/<resource>?page=&size=&...filters → { rows, total, page, size }. Đọc cho useQuery; ghi vẫn qua server actions.
type Q = URLSearchParams;
const int = (v: string | null) => Number(v) || undefined;

const LISTS: Record<string, (q: Q, skip: number, take: number) => Promise<[unknown[], number]>> = {
  async orders(q, skip, take) {
    const s = q.get("q");
    const where = { status: q.get("status") || undefined, channelId: int(q.get("channelId")), ...(s && { OR: [{ code: { contains: s } }, { externalRef: { contains: s } }, { customer: { name: { contains: s } } }] }) };
    return Promise.all([db.order.findMany({ where, include: { customer: true, channel: true }, orderBy: { id: "desc" }, skip, take }), db.order.count({ where })]);
  },
  async customers(q, skip, take) {
    const s = q.get("q");
    const where = { ...alive, channelId: int(q.get("channelId")), ...(s && { OR: [{ name: { contains: s } }, { phone: { contains: s } }] }) };
    return Promise.all([db.customer.findMany({ where, include: { channel: true, _count: { select: { orders: true } } }, orderBy: { name: "asc" }, skip, take }), db.customer.count({ where })]);
  },
  async products(q, skip, take) {
    const s = q.get("q");
    const where = { ...alive, ...(s && { OR: [{ code: { contains: s } }, { name: { contains: s } }, { nameVi: { contains: s } }, { marketSku: { contains: s } }] }) };
    const [rows, total, stock] = await Promise.all([db.product.findMany({ where, orderBy: { code: "asc" }, skip, take }), db.product.count({ where }), stockDetail()]);
    return [rows.map((p) => ({ ...p, stock: stock.get(p.id)?.cartons ?? 0, loose: stock.get(p.id)?.loose ?? 0 })), total];
  },
  async movements(q, skip, take) {
    const from = q.get("from");
    const where = { productId: int(q.get("productId")), type: q.get("type") || undefined, ...(from && { createdAt: { gte: new Date(from) } }) };
    return Promise.all([db.stockMovement.findMany({ where, include: { product: true, order: true, purchaseOrder: true, slip: { select: { id: true, code: true } }, createdBy: true }, orderBy: { id: "desc" }, skip, take }), db.stockMovement.count({ where })]);
  },
  async users(q, skip, take) {
    const s = q.get("q");
    const where = { ...alive, roleId: int(q.get("roleId")), ...(s && { OR: [{ name: { contains: s } }, { email: { contains: s } }] }) };
    return Promise.all([db.user.findMany({ where, select: { id: true, name: true, email: true, role: { select: { id: true, name: true, isAdmin: true } } }, orderBy: { id: "asc" }, skip, take }), db.user.count({ where })]);
  },
  async roles(q, skip, take) {
    const where = { ...alive };
    return Promise.all([db.role.findMany({ where, include: { _count: { select: { users: { where: alive } } } }, orderBy: [{ isAdmin: "desc" }, { id: "asc" }], skip, take }), db.role.count({ where })]);
  },
  async slips(q, skip, take) {
    const where = { status: q.get("status") || undefined, type: q.get("stype") || undefined };
    return Promise.all([db.stockSlip.findMany({ where, include: { createdBy: { select: { name: true } }, approvedBy: { select: { name: true } }, lines: { select: { cartons: true, units: true, pallets: true } } }, orderBy: { id: "desc" }, skip, take }), db.stockSlip.count({ where })]);
  },
  async "purchase-orders"(q, skip, take) {
    const where = { status: q.get("status") || undefined };
    return Promise.all([db.purchaseOrder.findMany({ where, include: { _count: { select: { items: { where: alive } } } }, orderBy: { id: "desc" }, skip, take }), db.purchaseOrder.count({ where })]);
  },
};

// Quyền xem cần có (một trong các quyền) cho từng resource. Bảng tồn ở Kho hàng dùng lại "products".
const VIEW: Record<string, Perm[]> = {
  orders: ["orders.view"], customers: ["customers.view"], products: ["products.view", "inventory.view"],
  movements: ["inventory.view"], slips: ["inventory.view"], "purchase-orders": ["purchase_orders.view"], users: ["users.manage"], roles: ["users.manage"],
};

export async function GET(req: NextRequest, { params }: { params: Promise<{ resource: string }> }) {
  const u = await sessionUser();
  if (!u) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const resource = (await params).resource, list = LISTS[resource];
  if (!list) return NextResponse.json({ error: "Not found" }, { status: 404 });
  if (!VIEW[resource].some((p) => can(u, p))) return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  const q = req.nextUrl.searchParams;
  const size = Math.min(100, Math.max(5, Number(q.get("size")) || 20));
  const page = Math.max(1, Math.floor(Number(q.get("page")) || 1));
  const [rows, total] = await list(q, (page - 1) * size, size);
  return NextResponse.json({ rows, total, page, size });
}
