import { NextResponse } from "next/server";
import { session, toMe } from "@/lib/db";

// GET /api/auth/me – "checkMe": token còn hạn không + quyền hiện tại. Client gọi mỗi lần chuyển trang.
export async function GET() {
  const s = await session();
  const meta = { serverTime: new Date().toISOString(), endpoint: "/api/auth/me" };
  if (!s) return NextResponse.json({ code: 401, success: false, message: "Phiên đăng nhập không hợp lệ hoặc đã hết hạn", ...meta }, { status: 401, headers: { "Cache-Control": "no-store" } });
  return NextResponse.json({ code: 0, success: true, result: toMe(s.user, s.exp), ...meta }, { headers: { "Cache-Control": "no-store" } });
}
