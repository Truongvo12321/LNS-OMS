"use server";
import { cookies, headers } from "next/headers";
import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { hashPassword, signJwt, verifyPassword, TOKEN_TTL } from "./auth";
import { parsePerms } from "./perms";
import { alive, db, requirePerm, stockDetail, stockMap, soldLastDays, suggestQty } from "./db";
import { normHeader, parseCsv } from "./csv";

const str = (f: FormData, k: string) => String(f.get(k) ?? "").trim();
const num = (f: FormData, k: string) => Number(f.get(k) || 0);
const cents = (f: FormData, k: string) => Math.round(num(f, k) * 100);
const fail = (path: string, msg: string): never => redirect(`${path}${path.includes("?") ? "&" : "?"}err=${encodeURIComponent(msg)}`);

/** Quay về đúng URL đang đứng (giữ bộ lọc + trang), bỏ ?edit, gắn ?ok=1. Chỉ chấp nhận cùng pathname. */
async function backTo(path: string) {
  const u = new URL((await headers()).get("referer") ?? path, "http://x");
  if (u.pathname !== path) return `${path}?ok=1`;
  ["edit", "err"].forEach((k) => u.searchParams.delete(k));
  u.searchParams.set("ok", "1");
  return `${path}?${u.searchParams}`;
}

export async function login(f: FormData) {
  const email = str(f, "email").toLowerCase(), password = String(f.get("password") ?? "");
  if (!email || !password) redirect(`/login?err=${encodeURIComponent("Vui lòng nhập email và mật khẩu")}&email=${encodeURIComponent(email)}`);
  const u = await db.user.findFirst({ where: { email, deletedAt: null } }); // tài khoản đã xóa không đăng nhập được
  // Cùng một thông báo cho sai email / sai mật khẩu để không lộ email nào tồn tại
  if (!u || !verifyPassword(password, u.passwordHash)) redirect(`/login?err=${encodeURIComponent("Email hoặc mật khẩu không đúng")}&email=${encodeURIComponent(email)}`);
  (await cookies()).set("token", signJwt({ sub: u.id }), { httpOnly: true, sameSite: "lax", secure: process.env.NODE_ENV === "production", path: "/", maxAge: TOKEN_TTL });
  redirect("/");
}
export async function logout() {
  (await cookies()).delete("token");
  redirect("/login");
}

// ---------- Người dùng & vai trò ----------
// Quy tắc an toàn: chỉ người thuộc vai trò Quản trị (isAdmin) mới gán / sửa / xóa thứ liên quan tới vai trò Quản trị.
export async function saveUser(f: FormData) {
  const me = await requirePerm("users.manage");
  const id = num(f, "id"), name = str(f, "name"), email = str(f, "email").toLowerCase(), roleId = num(f, "roleId"), password = String(f.get("password") ?? "");
  if (!name || !email) fail("/users", "Tên và email là bắt buộc");
  if ((!id || password) && password.length < 6) fail("/users", "Mật khẩu tối thiểu 6 ký tự");
  const role = await db.role.findFirst({ where: { id: roleId, deletedAt: null } });
  if (!role) fail("/users", "Vui lòng chọn vai trò hợp lệ");
  const target = id ? await db.user.findFirst({ where: { id, deletedAt: null }, include: { role: true } }) : null;
  if (id && !target) fail("/users", "Không tìm thấy tài khoản");
  if (!me.role.isAdmin && (role!.isAdmin || target?.role.isAdmin)) fail("/users", "Chỉ Quản trị viên mới gán / sửa tài khoản Quản trị");
  if (id === me.id && roleId !== me.roleId) fail("/users", "Không thể tự đổi vai trò của chính mình");
  if (await db.user.findFirst({ where: { email, NOT: { id } } })) fail("/users", `Email ${email} đã được dùng`);
  const data = { name, email, roleId, ...(password && { passwordHash: hashPassword(password) }) };
  if (id) await db.user.update({ where: { id }, data });
  else await db.user.create({ data: { ...data, passwordHash: hashPassword(password) } });
  revalidatePath("/users");
  redirect(await backTo("/users"));
}

export async function deleteUser(f: FormData) {
  const me = await requirePerm("users.manage");
  const id = num(f, "id");
  if (id === me.id) fail("/users", "Không thể tự xóa tài khoản đang đăng nhập");
  const target = await db.user.findUnique({ where: { id }, include: { role: true } });
  if (target?.role.isAdmin && !me.role.isAdmin) fail("/users", "Chỉ Quản trị viên mới xóa được tài khoản Quản trị");
  await db.user.update({ where: { id }, data: { deletedAt: new Date() } }); // xóa mềm: giữ lịch sử người lập đơn / phiếu kho
  revalidatePath("/users");
  redirect(await backTo("/users"));
}

export async function saveRole(f: FormData) {
  await requirePerm("users.manage");
  const id = num(f, "id"), name = str(f, "name"), description = str(f, "description") || null;
  if (!name) fail("/users", "Tên vai trò là bắt buộc");
  const cur = id ? await db.role.findFirst({ where: { id, deletedAt: null } }) : null;
  if (id && !cur) fail("/users", "Không tìm thấy vai trò");
  if (cur?.isAdmin) fail("/users", "Vai trò Quản trị luôn toàn quyền, không chỉnh được");
  if (await db.role.findFirst({ where: { name, NOT: { id } } })) fail("/users", `Vai trò "${name}" đã tồn tại`);
  const data = { name, description, permissions: parsePerms(f.getAll("perms").map(String).join(",")).join(",") };
  if (id) await db.role.update({ where: { id }, data });
  else await db.role.create({ data });
  revalidatePath("/users");
  redirect(await backTo("/users"));
}

export async function deleteRole(f: FormData) {
  await requirePerm("users.manage");
  const id = num(f, "id");
  const role = await db.role.findFirst({ where: { id, deletedAt: null }, include: { _count: { select: { users: { where: alive } } } } });
  if (!role) fail("/users", "Không tìm thấy vai trò");
  if (role!.isAdmin) fail("/users", "Không thể xóa vai trò Quản trị");
  if (role!._count.users) fail("/users", `Vai trò "${role!.name}" đang gán cho ${role!._count.users} tài khoản – chuyển họ sang vai trò khác trước`);
  // xóa mềm; đổi tên để tên cũ dùng lại được
  await db.role.update({ where: { id }, data: { deletedAt: new Date(), name: `${role!.name} (đã xóa #${id})` } });
  revalidatePath("/users");
  redirect(await backTo("/users"));
}

// ---------- Sản phẩm ----------
const MAX_IMAGE = 2 * 1024 * 1024;
/** Kiểm tra ảnh tải lên theo NỘI DUNG (magic bytes), không tin đuôi file / MIME do trình duyệt gửi. SVG bị từ chối (có thể chứa script). */
async function readImage(v: FormDataEntryValue | null): Promise<{ bytes: Uint8Array<ArrayBuffer>; type: string } | string | null> {
  if (!(v instanceof File) || v.size === 0) return null;
  if (v.size > MAX_IMAGE) return "Ảnh tối đa 2MB";
  const bytes = new Uint8Array(await v.arrayBuffer());
  const is = (sig: number[], at = 0) => sig.every((b, i) => bytes[at + i] === b);
  const type = is([0xff, 0xd8, 0xff]) ? "image/jpeg" : is([0x89, 0x50, 0x4e, 0x47]) ? "image/png" : is([0x52, 0x49, 0x46, 0x46]) && is([0x57, 0x45, 0x42, 0x50], 8) ? "image/webp" : null;
  return type ? { bytes, type } : "Chỉ nhận ảnh JPEG, PNG hoặc WebP";
}
export async function saveProduct(f: FormData) {
  await requirePerm("products.manage");
  const id = num(f, "id");
  const data = {
    code: str(f, "code").toUpperCase(), name: str(f, "name"), brand: str(f, "brand") || null, spec: str(f, "spec") || null,
    unitsPerCarton: Math.max(1, num(f, "unitsPerCarton")), wholesalePrice: cents(f, "wholesalePrice"), retailPrice: cents(f, "retailPrice"), minStock: Math.max(0, num(f, "minStock")),
    nameVi: str(f, "nameVi") || null, marketSku: str(f, "marketSku") || null,
  };
  const img = await readImage(f.get("image"));
  if (typeof img === "string") return fail("/products", img);
  const imageData = img ? { image: img.bytes, imageType: img.type, imageVer: { increment: 1 } } : f.get("removeImage") ? { image: null, imageType: null, imageVer: { increment: 1 } } : {};
  if (!data.code || !data.name) fail("/products", "Mã và tên sản phẩm là bắt buộc");
  const dup = await db.product.findFirst({ where: { code: data.code, NOT: { id } } });
  if (dup) fail("/products", `Mã ${data.code} đã tồn tại`);
  if (id) await db.product.update({ where: { id }, data: { ...data, ...imageData } });
  else await db.product.create({ data: { ...data, ...(img && typeof img !== "string" ? { image: img.bytes, imageType: img.type, imageVer: 1 } : {}) } });
  revalidatePath("/products");
  redirect(await backTo("/products"));
}

export async function deleteProduct(f: FormData) {
  await requirePerm("products.manage");
  await db.product.update({ where: { id: num(f, "id") }, data: { deletedAt: new Date() } }); // xóa mềm: giữ lịch sử đơn & thẻ kho
  revalidatePath("/products");
  redirect(await backTo("/products"));
}

// ---------- Khách hàng ----------
export async function saveCustomer(f: FormData) {
  await requirePerm("customers.manage");
  const id = num(f, "id");
  const data = { name: str(f, "name"), phone: str(f, "phone") || null, address: str(f, "address") || null, billAddress: str(f, "billAddress") || null, channelId: num(f, "channelId") };
  if (!data.name || !data.channelId) fail("/customers", "Tên và kênh bán là bắt buộc");
  if (id) await db.customer.update({ where: { id }, data });
  else await db.customer.create({ data });
  revalidatePath("/customers");
  redirect(await backTo("/customers"));
}

export async function deleteCustomer(f: FormData) {
  await requirePerm("customers.manage");
  await db.customer.update({ where: { id: num(f, "id") }, data: { deletedAt: new Date() } }); // xóa mềm: đơn cũ vẫn giữ khách
  revalidatePath("/customers");
  redirect(await backTo("/customers"));
}

// ---------- Đơn hàng ----------
type Line = { productId: number; qty: number; unitPrice: number };
async function nextCode(prefix: "SO" | "PO" | "PK") {
  const last = prefix === "SO" ? await db.order.findFirst({ orderBy: { id: "desc" } }) : prefix === "PO" ? await db.purchaseOrder.findFirst({ orderBy: { id: "desc" } }) : await db.stockSlip.findFirst({ orderBy: { id: "desc" } });
  return `${prefix}-${String((last?.id ?? 0) + 1).padStart(5, "0")}`;
}

type OrderExtra = { poNumber?: string; shipBy?: string; shipMethod?: string; carrier?: string };
const dateOrNull = (v?: string) => { const d = v ? new Date(v) : null; return d && !isNaN(+d) ? d : null; };

export async function createOrder(input: { customerId: number; note?: string; externalRef?: string; lines: Line[] } & OrderExtra) {
  const u = await requirePerm("orders.manage");
  const lines = input.lines.filter((l) => l.productId && l.qty > 0);
  if (!input.customerId || !lines.length) return { error: "Chọn khách hàng và ít nhất 1 dòng hàng có số lượng > 0" };
  const cust = await db.customer.findFirst({ where: { id: input.customerId, ...alive } });
  if (!cust) return { error: "Khách hàng không tồn tại" };
  const order = await db.order.create({
    data: {
      code: await nextCode("SO"), customerId: cust.id, channelId: cust.channelId, note: input.note || null, externalRef: input.externalRef || null, createdById: u.id,
      poNumber: input.poNumber?.trim() || null, shipBy: dateOrNull(input.shipBy), shipMethod: input.shipMethod?.trim() || null, carrier: input.carrier?.trim() || null,
      total: lines.reduce((s, l) => s + l.qty * l.unitPrice, 0), items: { create: lines.map(({ productId, qty, unitPrice }) => ({ productId, qty, unitPrice })) },
    },
  });
  revalidatePath("/orders");
  return { id: order.id };
}

const NEXT: Record<string, string[]> = { DRAFT: ["CONFIRMED", "CANCELLED"], CONFIRMED: ["DELIVERED", "CANCELLED"] };

export async function setOrderStatus(f: FormData) {
  const id = num(f, "id"), to = str(f, "status");
  const u = await requirePerm("orders.status");
  const path = `/orders/${id}`;
  const order = await db.order.findUnique({ where: { id }, include: { items: { include: { product: true } } } });
  if (!order) fail("/orders", "Không tìm thấy đơn");
  if (!NEXT[order!.status]?.includes(to)) fail(path, "Chuyển trạng thái không hợp lệ");

  if (to === "CONFIRMED") {
    // Xác nhận đơn = giữ hàng: kiểm tra tồn rồi ghi phiếu xuất
    const stock = await stockMap();
    const short = order!.items.filter((i) => (stock.get(i.productId) ?? 0) < i.qty);
    if (short.length) fail(path, "Không đủ tồn: " + short.map((i) => `${i.product.code} (cần ${i.qty}, còn ${stock.get(i.productId) ?? 0})`).join(", "));
    await db.$transaction([
      db.order.update({ where: { id }, data: { status: to } }),
      ...order!.items.map((i) => db.stockMovement.create({ data: { productId: i.productId, type: "OUT", qty: -i.qty, orderId: id, note: `Xuất theo đơn ${order!.code}`, createdById: u.id } })),
    ]);
  } else if (to === "CANCELLED" && order!.status === "CONFIRMED") {
    await db.$transaction([
      db.order.update({ where: { id }, data: { status: to } }),
      ...order!.items.map((i) => db.stockMovement.create({ data: { productId: i.productId, type: "RETURN", qty: i.qty, orderId: id, note: `Hoàn kho do hủy đơn ${order!.code}`, createdById: u.id } })),
    ]);
  } else {
    await db.order.update({ where: { id }, data: { status: to } });
  }
  revalidatePath(path);
  redirect(path);
}

// Import đơn từ file CSV: đọc theo TÊN CỘT nên nhận cả mẫu đơn giản lẫn file xuất gốc của Walmart Seller Center.
// Mẫu đơn giản: order_id,channel,customer,product_code,qty[,unit_price]
// Walmart: PO#, Order#, Order Date, Ship By, Customer Name, Customer Shipping Address, Customer Phone Number, Qty, SKU, Item Cost, Shipping Method, Carrier…
const COLS: Record<string, string[]> = {
  order: ["orderid", "order", "ordernumber"], po: ["po", "purchaseorder", "ponumber"], channel: ["channel", "kenh"],
  customer: ["customer", "customername", "khachhang"], address: ["customershippingaddress", "shiptoaddress", "address", "diachi"],
  phone: ["customerphonenumber", "phone", "dienthoai"], sku: ["productcode", "sku", "itemnumber", "masp"], qty: ["qty", "quantity", "soluong"],
  price: ["unitprice", "itemcost", "priceperunit", "dongia"], orderDate: ["orderdate"], shipBy: ["shipby"], shipMethod: ["shippingmethod", "shipmethod"], carrier: ["carrier", "carriermethod"],
};

export async function importOrdersCsv(f: FormData) {
  const u = await requirePerm("orders.manage");
  const file = f.get("file") as File | null;
  const [head, ...rows] = parseCsv(file && file.size ? await file.text() : str(f, "text"));
  if (!head || !rows.length) fail("/orders/import", "File trống hoặc sai định dạng");
  const idx = Object.fromEntries(Object.entries(COLS).map(([k, names]) => [k, head.map(normHeader).findIndex((h) => names.includes(h))]));
  const col = (r: string[], k: string) => (idx[k] >= 0 ? r[idx[k]] ?? "" : "");
  if (idx.order < 0 || idx.sku < 0) fail("/orders/import", "Không tìm thấy cột mã đơn (order_id / Order#) hoặc mã hàng (product_code / SKU)");

  const [channels, products] = await Promise.all([db.channel.findMany(), db.product.findMany({ where: alive })]);
  const fallback = channels.find((c) => c.id === num(f, "channelId")); // file Walmart không có cột kênh
  const groups = Map.groupBy(rows.filter((r) => col(r, "order")), (r) => col(r, "order"));
  let created = 0, skipped = 0;
  const errors: string[] = [];
  for (const [ext, rs] of groups) {
    if (await db.order.findFirst({ where: { externalRef: ext } })) { skipped++; continue; } // idempotent: import lại không tạo trùng
    const chName = col(rs[0], "channel");
    const ch = chName ? channels.find((c) => c.name.toLowerCase() === chName.toLowerCase()) : fallback;
    if (!ch) { errors.push(`${ext}: ${chName ? `kênh "${chName}" không tồn tại` : "chưa chọn kênh bán"}`); continue; }
    const lines: Line[] = [];
    for (const r of rs) {
      const code = col(r, "sku");
      const p = products.find((p) => p.marketSku === code || p.code === code.toUpperCase());
      if (!p) { errors.push(`${ext}: mã hàng "${code}" chưa gắn với sản phẩm nào (điền "Mã trên sàn" cho sản phẩm)`); lines.length = 0; break; }
      const price = Number(col(r, "price").replace(/[$,]/g, ""));
      lines.push({ productId: p.id, qty: Number(col(r, "qty")) || 1, unitPrice: price > 0 ? Math.round(price * 100) : p.retailPrice });
    }
    if (!lines.length) continue;
    const name = col(rs[0], "customer") || `Khách ${ch.name}`;
    const cust = (await db.customer.findFirst({ where: { name, channelId: ch.id, ...alive } }))
      ?? (await db.customer.create({ data: { name, channelId: ch.id, address: col(rs[0], "address") || null, phone: col(rs[0], "phone") || null } }));
    await db.order.create({
      data: {
        code: await nextCode("SO"), customerId: cust.id, channelId: ch.id, externalRef: ext, createdById: u.id, note: "Import CSV",
        poNumber: col(rs[0], "po") || null, shipBy: dateOrNull(col(rs[0], "shipBy")), shipMethod: col(rs[0], "shipMethod") || null, carrier: col(rs[0], "carrier") || null,
        ...(dateOrNull(col(rs[0], "orderDate")) && { createdAt: dateOrNull(col(rs[0], "orderDate"))! }),
        total: lines.reduce((s, l) => s + l.qty * l.unitPrice, 0), items: { create: lines },
      },
    });
    created++;
  }
  revalidatePath("/orders");
  redirect(`/orders/import?ok=${created}&skip=${skipped}${errors.length ? "&err=" + encodeURIComponent(errors.join(" | ")) : ""}`);
}

// ---------- Kho ----------
const SLIP_TYPES = ["IN", "OUT", "DAMAGED"];

/** Lập phiếu (chờ duyệt). Tồn chưa đổi cho tới khi duyệt. */
export async function createSlip(input: { type: string; date?: string; note?: string; lines: { productId: number; pallets?: number; cartons?: number; units?: number }[] }) {
  const u = await requirePerm("inventory.manage");
  if (!SLIP_TYPES.includes(input.type)) return { error: "Loại phiếu không hợp lệ" };
  const nn = (v?: number) => Math.max(0, Math.floor(Number(v) || 0));
  const lines = input.lines.map((l) => ({ productId: Number(l.productId), pallets: input.type === "IN" ? nn(l.pallets) : 0, cartons: nn(l.cartons), units: input.type === "IN" ? 0 : nn(l.units) }))
    .filter((l) => l.productId && (l.cartons || l.units));
  if (!lines.length) return { error: "Phiếu cần ít nhất 1 dòng có số thùng hoặc số lẻ > 0" };
  const slip = await db.stockSlip.create({
    data: { code: await nextCode("PK"), type: input.type, date: dateOrNull(input.date) ?? new Date(), note: input.note?.trim() || null, createdById: u.id, lines: { create: lines } },
  });
  revalidatePath("/inventory");
  return { id: slip.id };
}

/** Duyệt phiếu: kiểm tra tồn (xuất/hủy) rồi ghi StockMovement cho từng dòng trong 1 transaction. */
export async function approveSlip(f: FormData) {
  const u = await requirePerm("inventory.approve");
  const id = num(f, "id"), path = `/inventory/slips/${id}`;
  const slip = await db.stockSlip.findUnique({ where: { id }, include: { lines: { include: { product: true } } } });
  if (!slip || slip.status !== "PENDING") fail(path, "Phiếu không ở trạng thái chờ duyệt");
  const sign = slip!.type === "IN" ? 1 : -1;
  if (sign < 0) {
    const stock = await stockDetail();
    const need = Map.groupBy(slip!.lines, (l) => l.productId);
    const short = [...need].filter(([pid, ls]) => {
      const per = Math.max(1, ls[0].product.unitsPerCarton);
      return (stock.get(pid)?.total ?? 0) < ls.reduce((s, l) => s + l.cartons * per + l.units, 0);
    }).map(([, ls]) => ls[0].product.code);
    if (short.length) fail(path, `Không đủ tồn để xuất: ${short.join(", ")}`);
  }
  const note = slip!.note ? `${slip!.code} – ${slip!.note}` : slip!.code;
  await db.$transaction([
    db.stockSlip.update({ where: { id }, data: { status: "APPROVED", approvedById: u.id, approvedAt: new Date() } }),
    ...slip!.lines.map((l) => db.stockMovement.create({
      data: { productId: l.productId, type: slip!.type, qty: sign * l.cartons, units: sign * l.units, slipId: id, note, createdById: slip!.createdById, createdAt: slip!.date },
    })),
  ]);
  revalidatePath("/inventory");
  redirect(`${path}?ok=1`);
}

export async function rejectSlip(f: FormData) {
  const u = await requirePerm("inventory.approve");
  const id = num(f, "id");
  await db.stockSlip.updateMany({ where: { id, status: "PENDING" }, data: { status: "REJECTED", approvedById: u.id, approvedAt: new Date() } });
  revalidatePath("/inventory");
  redirect(`/inventory/slips/${id}?ok=1`);
}

// ---------- Đơn nhập hàng ----------
export async function createPOFromLowStock(f: FormData) {
  await requirePerm("purchase_orders.manage");
  const only = num(f, "productId");
  const [products, stock, sold] = await Promise.all([db.product.findMany({ where: alive }), stockMap(), soldLastDays(30)]);
  const items = products
    .filter((p) => (only ? p.id === only : (stock.get(p.id) ?? 0) <= p.minStock))
    .map((p) => ({ productId: p.id, qty: suggestQty(stock.get(p.id) ?? 0, p.minStock, sold.get(p.id) ?? 0) }));
  if (!items.length) fail("/purchase-orders", "Không có sản phẩm nào dưới mức tồn tối thiểu");
  const po = await db.purchaseOrder.create({ data: { code: await nextCode("PO"), supplier: str(f, "supplier") || null, items: { create: items } } });
  redirect(`/purchase-orders/${po.id}`);
}

export async function updatePOItem(f: FormData) {
  await requirePerm("purchase_orders.manage");
  const id = num(f, "itemId"), qty = num(f, "qty"), poId = num(f, "poId");
  if (qty < 1) fail(`/purchase-orders/${poId}`, "Số lượng phải ≥ 1 – dùng nút xóa để bỏ mặt hàng");
  await db.purchaseOrderItem.update({ where: { id, purchaseOrder: { status: "DRAFT" } }, data: { qty } });
  revalidatePath(`/purchase-orders/${poId}`);
}

export async function removePOItem(f: FormData) {
  await requirePerm("purchase_orders.manage");
  const id = num(f, "itemId"), poId = num(f, "poId");
  // Xóa mềm, và chỉ khi PO còn nháp
  await db.purchaseOrderItem.updateMany({ where: { id, purchaseOrder: { id: poId, status: "DRAFT" } }, data: { deletedAt: new Date() } });
  revalidatePath(`/purchase-orders/${poId}`);
  redirect(`/purchase-orders/${poId}?ok=1`);
}

export async function setPOStatus(f: FormData) {
  const u = await requirePerm("purchase_orders.manage");
  const id = num(f, "id"), to = str(f, "status");
  const po = await db.purchaseOrder.findUnique({ where: { id }, include: { items: { where: alive } } });
  const allowed: Record<string, string[]> = { DRAFT: ["ORDERED", "CANCELLED"], ORDERED: ["RECEIVED", "CANCELLED"] };
  if (!po || !allowed[po.status]?.includes(to)) fail(`/purchase-orders/${id}`, "Chuyển trạng thái không hợp lệ");
  if (to === "RECEIVED")
    await db.$transaction([
      db.purchaseOrder.update({ where: { id }, data: { status: to, receivedAt: new Date() } }),
      ...po!.items.map((i) => db.stockMovement.create({ data: { productId: i.productId, type: "IN", qty: i.qty, purchaseOrderId: id, note: `Nhập theo ${po!.code}`, createdById: u.id } })),
    ]);
  else await db.purchaseOrder.update({ where: { id }, data: { status: to } });
  revalidatePath(`/purchase-orders/${id}`);
  redirect(`/purchase-orders/${id}`);
}
