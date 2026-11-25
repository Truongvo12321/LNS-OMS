"use client";
import { useState } from "react";
import { saveRole } from "@/lib/actions";
import { MODULES, parsePerms, type Perm } from "@/lib/perms";
import { CloseModal } from "@/components/client";

type R = { id: number; name: string; description: string | null; permissions: string };

/** Form vai trò: tên + tick các quyền thuộc vai trò. */
export default function RoleForm({ edit }: { edit: R | null }) {
  const [perms, setPerms] = useState<Set<Perm>>(new Set(parsePerms(edit?.permissions ?? "")));
  const set = (ps: Perm[], on: boolean) => setPerms((s) => { const n = new Set(s); ps.forEach((p) => (on ? n.add(p) : n.delete(p))); return n; });

  return (
    <form action={saveRole} className="space-y-4">
      <input type="hidden" name="id" value={edit?.id ?? 0} />
      <div className="grid gap-3 sm:grid-cols-[14rem_1fr]">
        <label className="block"><span className="label">Tên vai trò *</span><input className="input" name="name" required defaultValue={edit?.name} placeholder="vd: Kế toán" /></label>
        <label className="block"><span className="label">Mô tả</span><input className="input" name="description" defaultValue={edit?.description ?? ""} placeholder="Vai trò này dùng cho ai, làm gì" /></label>
      </div>

      <fieldset>
        <legend className="label mb-2">Quyền của vai trò ({perms.size})</legend>
        <div className="divide-y divide-line rounded-md border border-line">
          {MODULES.map((m) => {
            const ps = m.perms.map(([p]) => p as Perm), all = ps.every((p) => perms.has(p));
            return (
              <div key={m.key} className="flex flex-col gap-2 px-3 py-2.5 sm:flex-row sm:items-center">
                <label className="flex w-52 shrink-0 cursor-pointer items-center gap-2 font-medium text-ink">
                  <input type="checkbox" className="size-4 accent-brand-700" checked={all} onChange={(e) => set(ps, e.target.checked)} />{m.label}
                </label>
                <div className="flex flex-wrap gap-x-4 gap-y-1.5">
                  {m.perms.map(([p, l]) => (
                    <label key={p} className="flex cursor-pointer items-center gap-1.5 text-slate-600">
                      <input type="checkbox" name="perms" value={p} className="size-4 accent-brand-700" checked={perms.has(p)} onChange={(e) => set([p], e.target.checked)} />{l}
                    </label>
                  ))}
                </div>
              </div>
            );
          })}
        </div>
      </fieldset>

      <div className="flex justify-end gap-2 border-t border-line pt-4"><CloseModal /><button className="btn">Lưu</button></div>
    </form>
  );
}
