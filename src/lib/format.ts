// Thuần hàm hiển thị, an toàn để import ở client component (không kéo Prisma vào bundle).
export const money = (cents: number) => "$" + (cents / 100).toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
export const fdate = (d: Date | string) => new Date(d).toLocaleString("vi-VN", { dateStyle: "short", timeStyle: "short" });

export const STATUS_LABEL: Record<string, string> = { DRAFT: "Nháp", CONFIRMED: "Đã xác nhận", DELIVERED: "Đã giao", CANCELLED: "Đã hủy", ORDERED: "Đã đặt", RECEIVED: "Đã nhận hàng" };
export const MOVE_LABEL: Record<string, string> = { IN: "Nhập", OUT: "Xuất", DAMAGED: "Hàng hủy", RETURN: "Hoàn kho" };

