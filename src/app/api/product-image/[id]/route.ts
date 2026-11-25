import { NextResponse } from "next/server";
import { db, sessionUser } from "@/lib/db";

// Trả ảnh sản phẩm lưu trong DB. URL có ?v=<imageVer> nên cache dài hạn an toàn (đổi ảnh → URL mới).
export async function GET(_: Request, { params }: { params: Promise<{ id: string }> }) {
  if (!(await sessionUser())) return new NextResponse(null, { status: 401 });
  const p = await db.product.findUnique({ where: { id: Number((await params).id) || 0 }, select: { image: true, imageType: true } });
  if (!p?.image || !p.imageType) return new NextResponse(null, { status: 404 });
  return new NextResponse(new Uint8Array(p.image), {
    headers: {
      "Content-Type": p.imageType, // chỉ jpeg/png/webp – đã kiểm tra magic bytes khi tải lên
      "X-Content-Type-Options": "nosniff",
      "Cache-Control": "private, max-age=31536000, immutable",
    },
  });
}
