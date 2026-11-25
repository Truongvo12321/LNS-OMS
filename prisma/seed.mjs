import { PrismaClient } from "@prisma/client";
const db = new PrismaClient();
import { randomBytes, scryptSync } from "node:crypto";
// Cùng định dạng "salt:hash" với src/lib/auth.ts
// Quyền của các vai trò mẫu – mã quyền xem src/lib/perms.ts
const PERMS = {
  SALES: "orders.view,orders.manage,orders.status,customers.view,customers.manage,products.view,inventory.view",
  WAREHOUSE: "orders.view,orders.status,products.view,products.manage,inventory.view,inventory.manage,inventory.approve,purchase_orders.view,purchase_orders.manage",
};
const hash = (pw) => { const s = randomBytes(16).toString("hex"); return `${s}:${scryptSync(pw, s, 64).toString("hex")}`; };

const c = (usd) => Math.round(usd * 100);
// Lấy từ catalogue mẫu của BA (giá trên catalogue = giá sỉ / thùng; giá lẻ = +20%)
const products = [
  ["LNS217", "Cooling Herbal Tea – Nước mát Sài Gòn", "Color Man", "320ML x 24", 24, 24.0, 40],
  ["LNS233", "Hillway Okinawa Milk Tea Fresh Pearl Cup", "Hillway", "70GR x 48", 48, 81.12, 20],
  ["LNS_F2003", "Ginger & Cordyceps Tea – Trà cốm gừng", "Hoang Linh Biotech", "20 STICK x 35", 35, 109.15, 10],
  ["LNS_F2014", "Jujube & Ginseng Extract Stick (30 sticks)", "Jayon Tree", "30 STICKS x 10", 10, 252.9, 5],
  ["LNS_F2015", "Jujube & Ginseng Extract Stick (12 sticks)", "Jayon Tree", "12 STICKS x 10", 10, 116.9, 8],
  ["LNS269", "Collagen Jujube Jelly Stick Korea (15 sticks)", "Jayon Tree", "15 STICKS x 30", 30, 284.7, 5],
  ["LNS259", "Meizan Macaroni Long Tube 400G", "Meizan", "400GR x 12", 12, 35.88, 30],
  ["LNS260", "Meizan Rice Vermicelli 300G", "Meizan", "300GR x 24", 24, 52.56, 30],
  ["LNS264", "Meizan Thin Round Egg Noodle 500G", "Meizan", "500GR x 12", 12, 35.88, 30],
  ["LNS274", "Meizan Tempura Crispy Frying Mix 1KG", "Meizan", "1KG x 10", 10, 36.9, 20],
  ["LNS246", "Sriracha Chilli Sauce 830G", "Nam Duong", "830G x 12 bottles", 12, 47.88, 25],
  ["LNS247", "Sriracha Chilli Sauce 480G", "Nam Duong", "480G x 12 bottles", 12, 29.88, 25],
  ["LNS017", "Nước mát Sài Gòn (6 lon/pack)", "Color Man", "6 lon/pack x 4", 4, 18.0, 30],
  ["LNS018", "Richy Jinju Gold Honey Rice Cracker 100G", "Richy", "100G x 24", 24, 28.5, 40],
  ["LNS019", "Richy Jinju Pink Salt Rice Cracker 134.4G", "Richy", "134.4G x 24", 24, 30.0, 40],
  ["LNS003", "Richy Kenju Nougat Cream Cracker 186G", "Richy", "186G x 16", 16, 33.6, 30],
  ["LNS004", "Richy Kenju Custard Latte Cracker 155G", "Richy", "155G x 16", 16, 33.6, 30],
];

async function main() {
  await db.stockMovement.deleteMany();
  await db.stockSlipLine.deleteMany();
  await db.stockSlip.deleteMany();
  await db.purchaseOrderItem.deleteMany();
  await db.purchaseOrder.deleteMany();
  await db.orderItem.deleteMany();
  await db.order.deleteMany();
  await db.customer.deleteMany();
  await db.channel.deleteMany();
  await db.product.deleteMany();
  await db.user.deleteMany();
  await db.role.deleteMany();

  const [rAdmin, rSales, rKho] = await Promise.all([
    db.role.create({ data: { name: "Quản trị", description: "Toàn quyền hệ thống", isAdmin: true } }),
    db.role.create({ data: { name: "Sales", description: "Đơn hàng, khách hàng, import đơn sàn", permissions: PERMS.SALES } }),
    db.role.create({ data: { name: "Kho", description: "Sản phẩm, phiếu kho, đơn nhập hàng", permissions: PERMS.WAREHOUSE } }),
  ]);

  const [admin, sales, kho] = await Promise.all([
    db.user.create({ data: { name: "Admin", email: "admin@demo.vn", passwordHash: hash("123456"), roleId: rAdmin.id } }),
    db.user.create({ data: { name: "Lan (Sales)", email: "sales@demo.vn", passwordHash: hash("123456"), roleId: rSales.id } }),
    db.user.create({ data: { name: "Kelvin (Kho)", email: "kho@demo.vn", passwordHash: hash("123456"), roleId: rKho.id } }),
  ]);

  const chNames = [["Sỉ trực tiếp", "WHOLESALE"], ["Shopee", "ECOMMERCE"], ["Lazada", "ECOMMERCE"], ["TikTok Shop", "ECOMMERCE"], ["Walmart Marketplace", "ECOMMERCE"]];
  const channels = [];
  for (const [name, type] of chNames) channels.push(await db.channel.create({ data: { name, type } }));

  const custData = [
    ["Đại lý Minh Phát", "0901234567", "12 Lê Lợi, Q1, HCM", 0],
    ["Siêu thị Hoà Bình", "0912345678", "45 Nguyễn Trãi, Q5, HCM", 0],
    ["Asian Mart Houston", "3145372680", "Houston, TX", 0],
    ["Khách lẻ Shopee", null, null, 1],
    ["Khách lẻ Lazada", null, null, 2],
    ["Khách lẻ TikTok", null, null, 3],
    ["Elizabeth Lopez", null, "12002 Fairpoint Dr, Houston, TX 77099", 4],
  ];
  const customers = [];
  for (const [name, phone, address, ch] of custData)
    customers.push(await db.customer.create({ data: { name, phone, address, channelId: channels[ch].id } }));

  const prods = [];
  for (const [code, name, brand, spec, upc, price, minStock] of products)
    prods.push(await db.product.create({ data: { code, name, brand, spec, unitsPerCarton: upc, wholesalePrice: c(price), retailPrice: c(price * 1.2), minStock } }));

  const daysAgo = (d) => new Date(Date.now() - d * 86400000);

  // 30 đơn trong 30 ngày qua để dashboard + gợi ý nhập có dữ liệu
  let seq = 1;
  for (let d = 30; d >= 1; d--) {
    const cust = customers[d % customers.length];
    const lines = [prods[d % prods.length], prods[(d * 3) % prods.length]].filter((p, i, a) => a.indexOf(p) === i);
    const wholesale = cust.channelId === channels[0].id;
    const items = lines.map((p) => ({ productId: p.id, qty: wholesale ? 3 + (d % 4) : 1 + (d % 2), unitPrice: wholesale ? p.wholesalePrice : p.retailPrice }));
    const status = d <= 2 ? "DRAFT" : d <= 6 ? "CONFIRMED" : "DELIVERED";
    const order = await db.order.create({
      data: {
        code: `SO-${String(seq++).padStart(5, "0")}`, customerId: cust.id, channelId: cust.channelId, status,
        externalRef: wholesale ? null : `${200013751032700 + d}`, total: items.reduce((s, i) => s + i.qty * i.unitPrice, 0),
        createdById: sales.id, createdAt: daysAgo(d), items: { create: items },
      },
    });
    if (status !== "DRAFT")
      for (const it of items)
        await db.stockMovement.create({ data: { productId: it.productId, type: "OUT", qty: -it.qty, orderId: order.id, note: `Xuất theo đơn ${order.code}`, createdById: kho.id, createdAt: daysAgo(d) } });
  }
  // Tồn đầu kỳ (35 ngày trước) = lượng đã xuất + mức đích, để tồn không bao giờ âm.
  // Mỗi mã thứ 5 cố tình kết thúc dưới mức tối thiểu để demo cảnh báo + đặt hàng.
  await db.stockMovement.create({ data: { productId: prods[1].id, type: "DAMAGED", qty: -2, note: "Móp hộp khi vận chuyển", createdById: kho.id, createdAt: daysAgo(10) } });
  const out = new Map((await db.stockMovement.groupBy({ by: ["productId"], _sum: { qty: true } })).map((r) => [r.productId, -r._sum.qty]));
  for (const [i, p] of prods.entries()) {
    const target = i % 5 === 0 ? Math.max(p.minStock - 2, 1) : p.minStock * 3;
    await db.stockMovement.create({ data: { productId: p.id, type: "IN", qty: (out.get(p.id) ?? 0) + target, note: "Tồn đầu kỳ (chuyển từ Excel)", createdById: kho.id, createdAt: daysAgo(35) } });
  }
  console.log("Seeded", { users: 3, channels: channels.length, products: prods.length, orders: seq - 1, admin: admin.email });
}

main().finally(() => db.$disconnect());
