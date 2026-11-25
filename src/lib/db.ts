import { PrismaClient } from "@prisma/client";
import { cookies, headers } from "next/headers";
import { redirect } from "next/navigation";
import { verifyJwt } from "./auth";

// Không bao giờ tải dữ liệu ảnh (Bytes) theo mặc định – chỉ route /api/product-image đọc với select image
const makeDb = () => new PrismaClient({ omit: { product: { image: true } } });
const g = globalThis as unknown as { db?: ReturnType<typeof makeDb> };
export const db = g.db ?? makeDb();
if (process.env.NODE_ENV !== "production") g.db = db;

export { money, fdate, STATUS_LABEL, MOVE_LABEL } from "./format";
import { ALL_PERMS, can, parsePerms, PERM_LABEL, type Perm } from "./perms";
/** Điều kiện lọc bản ghi chưa bị xóa mềm. */
export const alive = { deletedAt: null };

// Phiên đăng nhập = JWT ký HS256 trong cookie httpOnly "token". Role đọc lại từ DB để đổi quyền có hiệu lực ngay.
export async function sessionUser() {
  return (await session())?.user ?? null;
}

/** Phiên hiện tại: user còn hoạt động (tài khoản bị xóa → mất phiên ngay) + thời điểm token hết hạn. */
export async function session() {
  const token = (await cookies()).get("token")?.value;
  const claims = token ? verifyJwt(token) : null;
  const user = claims ? await db.user.findFirst({ where: { id: claims.sub, deletedAt: null }, include: { role: true } }) : null;
  return user ? { user, exp: claims!.exp } : null;
}

type SessionUser = NonNullable<Awaited<ReturnType<typeof session>>>["user"];
/** Dữ liệu "me" trả cho client (định dạng /api/auth/me). Quyền lấy từ vai trò; vai trò Quản trị = toàn quyền. */
export const toMe = (u: SessionUser, exp: number) => ({
  id: u.id, email: u.email, fullname: u.name, isAdmin: u.role.isAdmin,
  userRoles: [u.role.name], userPermissions: u.role.isAdmin ? ALL_PERMS : parsePerms(u.role.permissions),
  tokenExpiresAt: new Date(exp * 1000).toISOString(),
});
export type Me = ReturnType<typeof toMe>;
export async function currentUser() {
  const user = await sessionUser();
  if (!user) redirect("/login");
  return user;
}

/** Dùng trong server action: thiếu quyền → quay lại trang đang đứng kèm thông báo. */
export async function requirePerm(p: Perm) {
  const u = await currentUser();
  if (!can(u, p)) {
    const back = new URL((await headers()).get("referer") ?? "/", "http://x");
    back.searchParams.set("err", `Bạn không có quyền "${PERM_LABEL[p]}"`);
    redirect(back.pathname + back.search);
  }
  return u;
}

/** Dùng ở đầu page: thiếu quyền xem → về Tổng quan kèm thông báo. */
export async function guardPage(p: Perm) {
  const u = await currentUser();
  if (!can(u, p)) redirect(`/?err=${encodeURIComponent(`Bạn không có quyền "${PERM_LABEL[p]}"`)}`);
  return u;
}

/** Tồn kho hiện tại = tổng các StockMovement (không lưu số tồn). */
export async function stockDetail() {
  // Tồn tính theo đơn vị: thùng × (đơn vị/thùng) + lẻ, rồi quy lại thành thùng đầy + số lẻ còn dư
  const [rows, products] = await Promise.all([
    db.stockMovement.groupBy({ by: ["productId"], _sum: { qty: true, units: true } }),
    db.product.findMany({ select: { id: true, unitsPerCarton: true } }),
  ]);
  const upc = new Map(products.map((p) => [p.id, Math.max(1, p.unitsPerCarton)]));
  return new Map(rows.map((r) => {
    const per = upc.get(r.productId) ?? 1, total = (r._sum.qty ?? 0) * per + (r._sum.units ?? 0);
    return [r.productId, { cartons: Math.floor(total / per), loose: total - Math.floor(total / per) * per, total, per }];
  }));
}

/** Tồn theo thùng đầy (dùng cho so sánh tồn tối thiểu, tạo đơn…). */
export async function stockMap() {
  return new Map([...(await stockDetail())].map(([id, d]) => [id, d.cartons]));
}

/** Số thùng bán ra (OUT) trong N ngày gần nhất, dùng cho gợi ý nhập hàng. */
export async function soldLastDays(days = 30) {
  const rows = await db.stockMovement.groupBy({ by: ["productId"], where: { type: "OUT", createdAt: { gte: new Date(Date.now() - days * 86400000) } }, _sum: { qty: true } });
  return new Map(rows.map((r) => [r.productId, -(r._sum.qty ?? 0)]));
}

/** Gợi ý nhập: đủ bán 30 ngày tới + mức tồn tối thiểu − tồn hiện tại. */
export const suggestQty = (stock: number, min: number, sold30: number) => Math.max(sold30 + min - stock, min * 2 - stock, 1);
