// Danh sách quyền theo module. An toàn để import ở client (không có Prisma).
export const MODULES = [
  { key: "orders", label: "Đơn hàng", perms: [["orders.view", "Xem"], ["orders.manage", "Tạo / import đơn"], ["orders.status", "Duyệt / giao / hủy đơn"]] },
  { key: "customers", label: "Khách hàng", perms: [["customers.view", "Xem"], ["customers.manage", "Thêm / sửa / xóa"]] },
  { key: "products", label: "Sản phẩm", perms: [["products.view", "Xem"], ["products.manage", "Thêm / sửa / xóa"]] },
  { key: "inventory", label: "Kho hàng", perms: [["inventory.view", "Xem"], ["inventory.manage", "Lập phiếu kho"], ["inventory.approve", "Duyệt phiếu kho"]] },
  { key: "purchase_orders", label: "Đơn nhập hàng", perms: [["purchase_orders.view", "Xem"], ["purchase_orders.manage", "Tạo / sửa / nhận hàng"]] },
  { key: "users", label: "Người dùng & phân quyền", perms: [["users.manage", "Quản lý tài khoản & quyền"]] },
] as const;

export type Perm = (typeof MODULES)[number]["perms"][number][0];
export const ALL_PERMS = MODULES.flatMap((m) => m.perms.map(([p]) => p)) as Perm[];
export const PERM_LABEL = Object.fromEntries(MODULES.flatMap((m) => m.perms.map(([p, l]) => [p, `${m.label}: ${l}`]))) as Record<Perm, string>;

export const parsePerms = (s: string) => s.split(",").filter((p): p is Perm => (ALL_PERMS as string[]).includes(p));

/** Quyền của user = quyền của vai trò được gán. Vai trò isAdmin luôn toàn quyền. */
export type RoleLike = { isAdmin: boolean; permissions: string };
export const roleCan = (r: RoleLike, p: Perm) => r.isAdmin || parsePerms(r.permissions).includes(p);
export const can = (u: { role: RoleLike }, p: Perm) => roleCan(u.role, p);
