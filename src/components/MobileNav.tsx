"use client";
import { useEffect, useRef } from "react";
import { usePathname } from "next/navigation";
import { Menu, X } from "lucide-react";

/** Nút ☰ (chỉ hiện dưới lg) mở ngăn kéo menu trái. <dialog> lo focus trap + Esc; tự đóng khi chuyển trang. */
export default function MobileNav({ brand, nav, account }: { brand: React.ReactNode; nav: React.ReactNode; account: React.ReactNode }) {
  const dlg = useRef<HTMLDialogElement>(null), path = usePathname();
  useEffect(() => { dlg.current?.close(); }, [path]);
  return (
    <>
      <button type="button" aria-label="Mở menu" aria-haspopup="dialog" onClick={() => dlg.current?.showModal()}
        className="-ml-2 grid size-10 shrink-0 cursor-pointer place-items-center rounded-md text-slate-600 hover:bg-muted hover:text-ink lg:hidden">
        <Menu aria-hidden size={20} />
      </button>
      <dialog ref={dlg} aria-label="Menu" className="drawer" onClick={(e) => e.target === dlg.current && dlg.current?.close()}>
        <div className="flex h-full flex-col px-3 py-4">
          <div className="mb-6 flex items-center justify-between pl-3">
            {brand}
            <button type="button" aria-label="Đóng menu" autoFocus onClick={() => dlg.current?.close()} className="grid size-10 cursor-pointer place-items-center rounded-md text-slate-500 hover:bg-muted hover:text-ink"><X aria-hidden size={20} /></button>
          </div>
          <div className="min-h-0 flex-1 overflow-y-auto">{nav}</div>
          <div className="mt-4 border-t border-line px-3 pt-4">{account}</div>
        </div>
      </dialog>
    </>
  );
}
