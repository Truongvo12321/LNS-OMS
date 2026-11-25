import { CircleAlert, ChevronRight } from "lucide-react";
import { login } from "@/lib/actions";

export const dynamic = "force-dynamic";

// Các kênh bán thật trong hệ thống – thay cho danh sách "tính năng" kiểu landing page
const CHANNELS = ["Sỉ trực tiếp", "Shopee", "Lazada", "TikTok Shop", "Walmart Marketplace"];
const DEMO = [["admin@demo.vn", "Quản trị"], ["sales@demo.vn", "Sales"], ["kho@demo.vn", "Kho"]];

export default async function Login({ searchParams }: { searchParams: Promise<Record<string, string | undefined>> }) {
  const sp = await searchParams;
  return (
    <main className="ledger min-h-screen bg-bg">
      <div className="mx-auto grid min-h-screen max-w-6xl grid-rows-[auto_1fr_auto] px-5 sm:px-8">
        <header className="flex items-center gap-2.5 py-6">
          <div className="grid size-8 place-items-center rounded-md bg-ink text-sm font-bold text-white">L</div>
          <span className="font-semibold tracking-tight text-ink">LNS OMS</span>
          <span className="ml-1 rounded border border-line bg-white px-1.5 py-0.5 text-[11px] font-medium text-slate-500">Nội bộ</span>
        </header>

        <div className="grid items-center gap-12 py-8 lg:grid-cols-[1fr_24rem] lg:gap-20">
          <section className="hidden lg:block">
            <p className="mb-5 flex items-center gap-3 text-xs font-semibold uppercase tracking-[0.18em] text-brand-700">
              <span className="h-px w-8 bg-brand-700" />Sổ đơn hàng &amp; kho
            </p>
            <h1 className="max-w-xl text-[2.75rem] font-semibold leading-[1.1] tracking-tight text-ink">
              Mỗi thùng hàng
              <br />đi đâu, còn bao nhiêu —
              <br /><span className="text-brand-700">ghi một lần, khớp mọi nơi.</span>
            </h1>
            <p className="mt-6 max-w-md text-[15px] leading-relaxed text-slate-600">
              Đơn sỉ và đơn sàn về chung một sổ. Xác nhận đơn là trừ kho, hàng chạm mức tối thiểu là có gợi ý nhập.
            </p>

            <div className="mt-10 max-w-xl border-t border-ink/15 pt-4">
              <p className="mb-3 text-[11px] font-semibold uppercase tracking-[0.14em] text-slate-500">Kênh bán đang kết nối</p>
              <ul className="flex flex-wrap gap-x-5 gap-y-2 text-sm font-medium text-slate-700">
                {CHANNELS.map((c, i) => (
                  <li key={c} className="flex items-center gap-2">
                    <span className="font-mono text-[11px] text-slate-400">{String(i + 1).padStart(2, "0")}</span>{c}
                  </li>
                ))}
              </ul>
            </div>
          </section>

          <section className="mx-auto w-full max-w-sm lg:max-w-none">
            <div className="rounded-xl border border-line bg-white p-6 shadow-[0_1px_0_rgb(15_23_42/0.04),0_12px_32px_-12px_rgb(15_23_42/0.12)] sm:p-8">
              <h2 className="text-xl font-semibold tracking-tight text-ink">Đăng nhập</h2>
              <p className="mb-6 mt-1 text-slate-600">Dùng tài khoản được cấp để vào hệ thống.</p>

              {sp.err && <div role="alert" className="mb-4 flex items-start gap-2 rounded-md border border-rose-200 bg-rose-50 px-3 py-2.5 text-rose-700"><CircleAlert aria-hidden size={16} className="mt-0.5 shrink-0" />{sp.err}</div>}

              <form action={login} className="space-y-4">
                <label className="block">
                  <span className="label">Email</span>
                  <input name="email" type="email" required autoComplete="username" autoFocus defaultValue={sp.email ?? ""} placeholder="ten@congty.vn" className="input h-10!" />
                </label>
                <label className="block">
                  <span className="label">Mật khẩu</span>
                  <input name="password" type="password" required autoComplete="current-password" placeholder="Nhập mật khẩu" className="input h-10!" />
                </label>
                <button className="btn h-10 w-full">Đăng nhập</button>
              </form>

              <details className="group mt-6 border-t border-line pt-4 text-sm">
                <summary className="flex cursor-pointer list-none items-center gap-1 text-slate-600 hover:text-ink">
                  <ChevronRight aria-hidden size={15} className="transition-transform duration-150 group-open:rotate-90" />Tài khoản dùng thử
                </summary>
                <dl className="mt-3 divide-y divide-line rounded-md border border-line text-[13px]">
                  {DEMO.map(([email, role]) => (
                    <div key={email} className="flex items-center justify-between px-3 py-2">
                      <dt className="font-mono text-slate-700">{email}</dt><dd className="text-slate-500">{role}</dd>
                    </div>
                  ))}
                </dl>
                <p className="mt-2 text-xs text-slate-500">Mật khẩu chung: <span className="font-mono text-slate-700">123456</span></p>
              </details>
            </div>
          </section>
        </div>

        <footer className="flex flex-wrap justify-between gap-2 py-6 text-xs text-slate-500">
          <span>© 2026 LNS · Quản lý đơn hàng &amp; kho</span>
          <span>v1.0</span>
        </footer>
      </div>
    </main>
  );
}
