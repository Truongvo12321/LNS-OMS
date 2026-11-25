"use client";
import { useState } from "react";
import { saveUser } from "@/lib/actions";
import { ALL_PERMS, PERM_LABEL, parsePerms } from "@/lib/perms";
import { CloseModal } from "@/components/client";

type U = { id: number; name: string; email: string; roleId: number };
export type RoleOpt = { id: number; name: string; isAdmin: boolean; permissions: string };

/** Form tài khoản: chỉ chọn vai trò; quyền đến từ vai trò (xem trước bên dưới). */
export default function UserForm({ edit, roles, isSelf }: { edit: U | null; roles: RoleOpt[]; isSelf: boolean }) {
  const [roleId, setRoleId] = useState(edit?.roleId ?? roles.find((r) => !r.isAdmin)?.id ?? roles[0]?.id);
  const role = roles.find((r) => r.id === roleId);
  const perms = role?.isAdmin ? ALL_PERMS : parsePerms(role?.permissions ?? "");

  return (
    <form action={saveUser} className="space-y-4">
      <input type="hidden" name="id" value={edit?.id ?? 0} />
      <div className="grid gap-3 sm:grid-cols-2">
        <label className="block"><span className="label">Họ tên *</span><input className="input" name="name" required placeholder="vd: Nguyễn Thị Lan" defaultValue={edit?.name} /></label>
        <label className="block"><span className="label">Email đăng nhập *</span><input className="input" name="email" type="email" required autoComplete="off" placeholder="ten@congty.vn" defaultValue={edit?.email} /></label>
        <label className="block"><span className="label">{edit ? "Mật khẩu mới (bỏ trống nếu giữ nguyên)" : "Mật khẩu *"}</span>
          <input className="input" name="password" type="password" minLength={6} required={!edit} autoComplete="new-password" placeholder="Tối thiểu 6 ký tự" />
        </label>
        <label className="block"><span className="label">Vai trò *</span>
          <select className="input" name="roleId" value={roleId} disabled={isSelf} onChange={(e) => setRoleId(Number(e.target.value))}>
            {roles.map((r) => <option key={r.id} value={r.id}>{r.name}</option>)}
          </select>
          {isSelf && <><input type="hidden" name="roleId" value={roleId} /><span className="mt-1 block text-xs text-slate-500">Không thể tự đổi vai trò của chính mình.</span></>}
        </label>
      </div>

      <div>
        <p className="label mb-2">Quyền theo vai trò {role && `“${role.name}”`}</p>
        <div className="rounded-md border border-line bg-muted px-3 py-2.5">
          {role?.isAdmin ? <p className="text-slate-600">Toàn quyền hệ thống.</p> : perms.length ? (
            <ul className="flex flex-wrap gap-1.5">{perms.map((p) => <li key={p} className="rounded bg-white px-2 py-0.5 text-xs text-slate-700 ring-1 ring-line">{PERM_LABEL[p]}</li>)}</ul>
          ) : <p className="text-slate-500">Vai trò này chưa có quyền nào.</p>}
        </div>
        <p className="mt-1.5 text-xs text-slate-500">Muốn đổi quyền? Sửa vai trò ở tab “Vai trò” – mọi tài khoản thuộc vai trò đó được cập nhật theo.</p>
      </div>

      <div className="flex justify-end gap-2 border-t border-line pt-4"><CloseModal /><button className="btn">Lưu</button></div>
    </form>
  );
}
