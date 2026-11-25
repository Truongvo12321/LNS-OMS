"use client";
import { useEffect, useId, useRef, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ChevronLeft, ChevronRight, LoaderCircle, MoreHorizontal, Plus, Search, TriangleAlert, X } from "lucide-react";
import { useUrlState, type Page } from "@/lib/query";

type Confirm = { title: string; message: React.ReactNode; confirmLabel?: string };

/** Modal xác nhận dùng chung. <dialog> lo focus trap + phím Esc; bấm nền để đóng. */
function ConfirmDialog({ dlg, title, message, confirmLabel = "Xác nhận", onConfirm }: Confirm & { dlg: React.RefObject<HTMLDialogElement | null>; onConfirm: () => void }) {
  const id = useId();
  return (
    <dialog ref={dlg} className="modal" aria-labelledby={`${id}-t`} aria-describedby={`${id}-d`} onClick={(e) => e.target === dlg.current && dlg.current?.close()}>
      <div className="flex gap-3">
        <div className="grid size-10 shrink-0 place-items-center rounded-full bg-red-50 text-red-600"><TriangleAlert aria-hidden size={20} /></div>
        <div className="min-w-0">
          <h2 id={`${id}-t`} className="text-base font-semibold text-ink">{title}</h2>
          <div id={`${id}-d`} className="mt-1 text-slate-600">{message}</div>
        </div>
      </div>
      <div className="mt-5 flex justify-end gap-2">
        <button type="button" className="btn-ghost" autoFocus onClick={() => dlg.current?.close()}>Hủy</button>
        <button type="button" className="btn-danger" onClick={() => { dlg.current?.close(); onConfirm(); }}>{confirmLabel}</button>
      </div>
    </dialog>
  );
}

/** Nút mở modal xác nhận; bấm "Xác nhận" mới submit form chứa nút. */
export function ConfirmButton({ children, className = "btn-red", label, ...c }: Confirm & { children: React.ReactNode; className?: string; label?: string }) {
  const dlg = useRef<HTMLDialogElement>(null), btn = useRef<HTMLButtonElement>(null);
  return (
    <>
      <button type="button" ref={btn} className={className} aria-label={label} title={label} onClick={() => dlg.current?.showModal()}>{children}</button>
      <ConfirmDialog dlg={dlg} {...c} onConfirm={() => btn.current?.form?.requestSubmit()} />
    </>
  );
}

export type MenuItem =
  | { label: string; icon?: React.ElementType; href: string; scroll?: boolean }
  | { label: string; icon?: React.ElementType; action: (f: FormData) => void | Promise<void>; fields: Record<string, string | number>; danger?: boolean; confirm?: Confirm };

/**
 * Nút "⋯" mở menu thao tác của một dòng. Menu position:fixed nên không bị bảng (overflow) cắt.
 * Thao tác cần xác nhận: đóng menu rồi mở ConfirmDialog; form submit nằm ngoài menu nên vẫn còn sau khi menu đóng.
 */
export function RowMenu({ items, label = "Thao tác" }: { items: MenuItem[]; label?: string }) {
  const [pos, setPos] = useState<React.CSSProperties | null>(null);
  const btn = useRef<HTMLButtonElement>(null), menu = useRef<HTMLDivElement>(null), id = useId();
  const triggers = useRef<(() => void)[]>([]);
  const close = (focus = true) => { setPos(null); if (focus) btn.current?.focus(); };

  const open = () => {
    const r = btn.current!.getBoundingClientRect(), right = window.innerWidth - r.right;
    // Gần đáy màn hình → bật menu lên trên
    setPos(r.bottom + 48 * items.length + 16 > window.innerHeight ? { bottom: window.innerHeight - r.top + 4, right } : { top: r.bottom + 4, right });
  };

  useEffect(() => {
    if (!pos) return;
    menu.current?.querySelector<HTMLElement>("[role=menuitem]")?.focus();
    const outside = (e: PointerEvent) => { if (!menu.current?.contains(e.target as Node) && !btn.current?.contains(e.target as Node)) close(false); };
    const dismiss = () => close(false);
    document.addEventListener("pointerdown", outside);
    window.addEventListener("scroll", dismiss, true);
    window.addEventListener("resize", dismiss);
    return () => { document.removeEventListener("pointerdown", outside); window.removeEventListener("scroll", dismiss, true); window.removeEventListener("resize", dismiss); };
  }, [pos]);

  const onKey = (e: React.KeyboardEvent) => {
    const els = [...(menu.current?.querySelectorAll<HTMLElement>("[role=menuitem]") ?? [])], i = els.indexOf(document.activeElement as HTMLElement);
    if (e.key === "Escape") { e.preventDefault(); close(); }
    else if (e.key === "ArrowDown") { e.preventDefault(); els[(i + 1) % els.length]?.focus(); }
    else if (e.key === "ArrowUp") { e.preventDefault(); els[(i - 1 + els.length) % els.length]?.focus(); }
    else if (e.key === "Tab") close(false);
  };

  const run = (i: number) => { close(false); triggers.current[i]?.(); };

  const item = "flex min-h-9 w-full cursor-pointer items-center gap-2.5 rounded-md px-2.5 text-left text-sm outline-none transition-colors duration-100";
  return (
    <>
      <button type="button" ref={btn} aria-label={label} title={label} aria-haspopup="menu" aria-expanded={!!pos} aria-controls={pos ? id : undefined}
        onClick={() => (pos ? close() : open())}
        className={`mx-auto grid size-8 cursor-pointer place-items-center rounded-md text-slate-500 transition-colors duration-150 hover:bg-muted hover:text-ink ${pos ? "bg-muted text-ink" : ""}`}>
        <MoreHorizontal aria-hidden size={18} />
      </button>

      {pos && (
        <div ref={menu} id={id} role="menu" aria-label={label} onKeyDown={onKey} style={pos}
          className="menu-in fixed z-50 min-w-44 rounded-lg border border-line bg-white p-1 text-left font-normal whitespace-nowrap shadow-[0_8px_24px_-6px_rgb(15_23_42/0.15),0_2px_6px_-2px_rgb(15_23_42/0.08)]">
          {items.map((it, i) => {
            const Icon = it.icon;
            const body = <>{Icon && <Icon aria-hidden size={16} className="shrink-0" />}{it.label}</>;
            if ("href" in it) return <Link key={i} role="menuitem" href={it.href} scroll={it.scroll} onClick={() => close(false)} className={`${item} text-slate-700 hover:bg-muted focus-visible:bg-muted`}>{body}</Link>;
            return (
              <button key={i} type="button" role="menuitem" onClick={() => run(i)}
                className={`${item} ${it.danger ? "text-red-600 hover:bg-red-50 focus-visible:bg-red-50" : "text-slate-700 hover:bg-muted focus-visible:bg-muted"}`}>
                {body}
              </button>
            );
          })}
        </div>
      )}

      {items.map((it, i) => "action" in it && <ActionForm key={i} it={it} onReady={(fn) => { triggers.current[i] = fn; }} />)}
    </>
  );
}

/** Form ẩn + modal xác nhận của một thao tác trong RowMenu; nằm ngoài menu nên vẫn tồn tại khi menu đóng. */
function ActionForm({ it, onReady }: { it: Extract<MenuItem, { action: unknown }>; onReady: (run: () => void) => void }) {
  const form = useRef<HTMLFormElement>(null), dlg = useRef<HTMLDialogElement>(null);
  useEffect(() => onReady(() => (it.confirm ? dlg.current?.showModal() : form.current?.requestSubmit())), [it, onReady]);
  return (
    <>
      <form ref={form} action={it.action} hidden>
        {Object.entries(it.fields).map(([k, v]) => <input key={k} type="hidden" name={k} value={v} />)}
      </form>
      {it.confirm && <ConfirmDialog dlg={dlg} {...it.confirm} onConfirm={() => form.current?.requestSubmit()} />}
    </>
  );
}

/**
 * Modal chứa form thêm / sửa. Nút trigger mở modal; `open` = true (vd. đang ?edit=) thì tự mở.
 * Đóng modal khi đang sửa → bỏ ?edit khỏi URL để lần mở sau là form trống.
 */
export function FormModal({ title, trigger, open = false, wide = false, param = "edit", children }: { title: string; trigger: React.ReactNode; open?: boolean; wide?: boolean; param?: string; children: React.ReactNode }) {
  const dlg = useRef<HTMLDialogElement>(null), id = useId(), router = useRouter(), { sp } = useUrlState();
  useEffect(() => { if (open && !dlg.current?.open) dlg.current?.showModal(); }, [open]);
  // children chỉ đổi khi server render lại (sau khi lưu xong / chuyển trang) → đóng modal nếu không còn ở chế độ sửa
  useEffect(() => { if (!open) dlg.current?.close(); }, [children, open]);
  const onClose = () => {
    if (!sp.get(param)) return;
    const p = new URLSearchParams(sp.toString()); p.delete(param);
    router.replace(`?${p}`, { scroll: false });
  };
  return (
    <>
      <button type="button" className="btn" onClick={() => dlg.current?.showModal()}><Plus aria-hidden size={16} />{trigger}</button>
      <dialog ref={dlg} className={`modal p-0 ${wide ? "w-[min(46rem,calc(100vw-2rem))]" : "w-[min(34rem,calc(100vw-2rem))]"}`} aria-labelledby={`${id}-t`} onClose={onClose} onClick={(e) => e.target === dlg.current && dlg.current?.close()}>
        <div className="flex items-center justify-between border-b border-line px-5 py-3.5">
          <h2 id={`${id}-t`} className="text-base font-semibold text-ink">{title}</h2>
          <CloseModal className="grid size-9 place-items-center rounded-md text-slate-500 hover:bg-muted hover:text-ink cursor-pointer" label="Đóng"><X aria-hidden size={18} /></CloseModal>
        </div>
        <div className="max-h-[calc(100dvh-8rem)] overflow-y-auto p-5">{children}</div>
      </dialog>
    </>
  );
}

/** Nút đóng <dialog> gần nhất – dùng được trong form render từ server component. */
export function CloseModal({ children = "Hủy", className = "btn-ghost", label }: { children?: React.ReactNode; className?: string; label?: string }) {
  return <button type="button" className={className} aria-label={label} onClick={(e) => e.currentTarget.closest("dialog")?.close()}>{children}</button>;
}

/** Tab lưu trên URL (?tab=) để reload vẫn giữ tab. Tab đầu tiên là mặc định. Phím ←/→ chuyển tab. */
export function Tabs({ tabs }: { tabs: { key: string; label: React.ReactNode; content: React.ReactNode }[] }) {
  const { sp, set } = useUrlState(), id = useId();
  const cur = tabs.find((t) => t.key === sp.get("tab")) ?? tabs[0];
  const go = (key: string) => {
    set({ tab: key === tabs[0].key ? undefined : key });
    document.getElementById(`${id}-${key}`)?.scrollIntoView({ block: "nearest", inline: "nearest" }); // mobile: tab được chọn luôn trong tầm nhìn
  };
  const onKey = (e: React.KeyboardEvent) => {
    const i = tabs.indexOf(cur), d = e.key === "ArrowRight" ? 1 : e.key === "ArrowLeft" ? -1 : 0;
    if (!d) return;
    const next = tabs[(i + d + tabs.length) % tabs.length];
    go(next.key);
    document.getElementById(`${id}-${next.key}`)?.focus();
  };
  return (
    <div>
      <div role="tablist" className="no-scrollbar -mx-4 mb-4 flex gap-1 overflow-x-auto border-b border-line px-4 sm:mx-0 sm:px-0" onKeyDown={onKey}>
        {tabs.map((t) => {
          const on = t.key === cur.key;
          return (
            <button key={t.key} id={`${id}-${t.key}`} role="tab" aria-selected={on} aria-controls={`${id}-p`} tabIndex={on ? 0 : -1} onClick={() => go(t.key)}
              className={`-mb-px inline-flex min-h-10 shrink-0 cursor-pointer items-center gap-2 whitespace-nowrap border-b-2 px-3 font-medium transition-colors duration-150 ${on ? "border-brand-700 text-brand-700" : "border-transparent text-slate-500 hover:text-ink"}`}>
              {t.label}
            </button>
          );
        })}
      </div>
      <div role="tabpanel" id={`${id}-p`} aria-labelledby={`${id}-${cur.key}`}>{cur.content}</div>
    </div>
  );
}

/** Ô tìm kiếm ghi vào URL (debounce 300ms), reset về trang 1. */
export function SearchBox({ name = "q", placeholder, pageKey = "page" }: { name?: string; placeholder: string; pageKey?: string }) {
  const { sp, set } = useUrlState();
  const [v, setV] = useState(sp.get(name) ?? "");
  const first = useRef(true);
  // URL đổi từ nơi khác (vd. ô tìm nhanh trên thanh trên) → cập nhật ô nhập
  const urlV = sp.get(name) ?? "";
  useEffect(() => { setV((cur) => (cur.trim() === urlV ? cur : urlV)); }, [urlV]);
  useEffect(() => {
    if (first.current) { first.current = false; return; }
    const t = setTimeout(() => set({ [name]: v.trim(), [pageKey]: undefined }), 300);
    return () => clearTimeout(t);
  }, [v]); // eslint-disable-line react-hooks/exhaustive-deps
  return (
    <div className="relative w-full max-w-xs">
      <Search aria-hidden size={16} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
      <input type="search" aria-label={placeholder} value={v} onChange={(e) => setV(e.target.value)} placeholder={placeholder} className="input pl-9" />
    </div>
  );
}

/** Select lọc ghi vào URL, reset về trang 1. */
export function FilterSelect({ name, label, options, className = "w-44", pageKey = "page" }: { name: string; label: string; options: [string | number, string][]; className?: string; pageKey?: string }) {
  const { sp, set } = useUrlState();
  return (
    <select aria-label={label} value={sp.get(name) ?? ""} onChange={(e) => set({ [name]: e.target.value, [pageKey]: undefined })} className={`input ${className}`}>
      <option value="">{label}</option>
      {options.map(([v, t]) => <option key={v} value={v}>{t}</option>)}
    </select>
  );
}

export function Pagination({ data, prefix = "", fetching }: { data?: Page<unknown>; prefix?: string; fetching?: boolean }) {
  const { set } = useUrlState();
  if (!data) return null;
  const { page, size, total } = data, pages = Math.max(1, Math.ceil(total / size));
  const go = (p: number) => set({ [prefix + "page"]: p === 1 ? undefined : p });
  const nums = Array.from(new Set([1, page - 1, page, page + 1, pages])).filter((n) => n >= 1 && n <= pages).sort((a, b) => a - b);
  const pg = "grid h-8 min-w-8 place-items-center rounded-md px-2 text-sm font-medium transition-colors duration-150 cursor-pointer disabled:cursor-not-allowed disabled:opacity-40";
  return (
    <nav aria-label="Phân trang" className="flex flex-wrap items-center gap-3 border-t border-line px-4 py-2.5 text-sm text-slate-600">
      <span className="tabular-nums">{total ? `${(page - 1) * size + 1}–${Math.min(page * size, total)}` : 0} / {total}</span>
      {fetching && <LoaderCircle aria-label="Đang tải" size={15} className="animate-spin text-slate-400" />}
      <select aria-label="Số dòng mỗi trang" value={size} onChange={(e) => set({ [prefix + "size"]: e.target.value === "20" ? undefined : e.target.value, [prefix + "page"]: undefined })} className="input h-8! w-auto py-0 text-sm">
        {[10, 20, 50, 100].map((n) => <option key={n} value={n}>{n} / trang</option>)}
      </select>
      <div className="ml-auto flex items-center gap-1">
        <button className={`${pg} hover:bg-muted`} disabled={page <= 1} onClick={() => go(page - 1)} aria-label="Trang trước"><ChevronLeft size={16} /></button>
        {nums.map((n, i) => (
          <span key={n} className="flex items-center gap-1">
            {i > 0 && n - nums[i - 1] > 1 && <span aria-hidden className="px-1 text-slate-400">…</span>}
            <button className={`${pg} ${n === page ? "bg-brand-700 text-white" : "hover:bg-muted"}`} aria-current={n === page ? "page" : undefined} onClick={() => go(n)}>{n}</button>
          </span>
        ))}
        <button className={`${pg} hover:bg-muted`} disabled={page >= pages} onClick={() => go(page + 1)} aria-label="Trang sau"><ChevronRight size={16} /></button>
      </div>
    </nav>
  );
}

export function ListState({ q, empty }: { q: { isPending: boolean; isError: boolean; error: Error | null; data?: Page<unknown> }; empty: string }) {
  if (q.isPending) return <div className="space-y-2 p-4" aria-busy="true">{Array.from({ length: 5 }, (_, i) => <div key={i} className="h-8 animate-pulse rounded bg-muted" />)}</div>;
  if (q.isError) return <p role="alert" className="p-4 text-red-700">{q.error?.message}</p>;
  if (!q.data?.rows.length) return <p className="p-4 text-slate-500">{empty}</p>;
  return null;
}
