"use client";
import { useMe } from "@/lib/me";
import { Pencil, Trash2 } from "lucide-react";
import { useList, useUrlState } from "@/lib/query";
import { ALL_PERMS, PERM_LABEL, parsePerms } from "@/lib/perms";
import { deleteRole, deleteUser } from "@/lib/actions";
import { FilterSelect, ListState, Pagination, RowMenu, SearchBox } from "@/components/client";

const RoleBadge = ({ name, isAdmin }: { name: string; isAdmin: boolean }) => (
  <span className={`inline-flex whitespace-nowrap rounded-md px-2 py-0.5 text-xs font-medium ring-1 ring-inset ${isAdmin ? "bg-violet-50 text-violet-700 ring-violet-200" : "bg-sky-50 text-sky-700 ring-sky-200"}`}>{name}</span>
);

type URow = { id: number; name: string; email: string; role: { id: number; name: string; isAdmin: boolean } };

export function UserList({ rev, roles }: { rev: number; roles: [number, string][] }) {
  const me = useMe(), meId = me?.id, meIsAdmin = !!me?.isAdmin;
  const q = useList<URow>("users", ["q", "roleId"], { rev });
  const { href } = useUrlState();
  return (
    <>
      <div className="filters mb-3">
        <SearchBox placeholder="Tên / email…" />
        <FilterSelect name="roleId" label="Mọi vai trò" className="w-48" options={roles} />
      </div>
      <div className="card overflow-hidden p-0">
        <div className="overflow-x-auto">
          <table className="tbl">
            <thead><tr><th>Họ tên</th><th>Email</th><th>Vai trò</th><th className="w-24 text-center">Thao tác</th></tr></thead>
            <tbody>
              {q.data?.rows.map((u) => {
                const editable = meIsAdmin || !u.role.isAdmin;
                return (
                  <tr key={u.id}>
                    <td className="font-medium text-ink">{u.name}{u.id === meId && <span className="ml-2 text-xs font-normal text-slate-500">(bạn)</span>}</td>
                    <td>{u.email}</td>
                    <td><RoleBadge {...u.role} /></td>
                    <td className="w-14 text-center">
                      {editable && <RowMenu label={`Thao tác ${u.name}`} items={[
                        { label: "Sửa", icon: Pencil, href: href({ edit: u.id, ok: undefined, err: undefined }) },
                        ...(u.id !== meId ? [{ label: "Xóa", icon: Trash2, action: deleteUser, fields: { id: u.id }, danger: true, confirm: {
                          title: "Xóa tài khoản?", confirmLabel: "Xóa",
                          message: <>Tài khoản <b>{u.email}</b> sẽ bị vô hiệu hóa và đăng xuất ngay. Lịch sử đơn hàng / phiếu kho do người này lập vẫn được giữ.</>,
                        } }] : []),
                      ]} />}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
        <ListState q={q} empty="Không có tài khoản nào." />
        <Pagination data={q.data} fetching={q.isFetching} />
      </div>
    </>
  );
}

type RRow = { id: number; name: string; description: string | null; permissions: string; isAdmin: boolean; _count: { users: number } };

export function RoleList({ rev }: { rev: number }) {
  const q = useList<RRow>("roles", [], { prefix: "r", rev });
  const { href } = useUrlState();
  return (
    <div className="card overflow-hidden p-0">
      <div className="overflow-x-auto">
        <table className="tbl">
          <thead><tr><th>Vai trò</th><th>Mô tả</th><th>Quyền</th><th className="text-center">Số tài khoản</th><th className="w-24 text-center">Thao tác</th></tr></thead>
          <tbody>
            {q.data?.rows.map((r) => {
              const ps = r.isAdmin ? ALL_PERMS : parsePerms(r.permissions);
              return (
                <tr key={r.id}>
                  <td><RoleBadge name={r.name} isAdmin={r.isAdmin} /></td>
                  <td className="text-slate-600">{r.description}</td>
                  <td className="min-w-56">
                    <span className="text-slate-600" title={ps.map((p) => PERM_LABEL[p]).join("\n")}>{r.isAdmin ? "Toàn quyền" : `${ps.length}/${ALL_PERMS.length} quyền`}</span>
                  </td>
                  <td className="text-center">{r._count.users}</td>
                  <td className="w-14 text-center">
                    {r.isAdmin ? <span className="text-xs text-slate-500">Hệ thống</span> : <RowMenu label={`Thao tác ${r.name}`} items={[
                      { label: "Sửa", icon: Pencil, href: href({ editRole: r.id, ok: undefined, err: undefined }) },
                      { label: "Xóa", icon: Trash2, action: deleteRole, fields: { id: r.id }, danger: true, confirm: {
                        title: "Xóa vai trò?", confirmLabel: "Xóa",
                        message: r._count.users ? <>Vai trò <b>{r.name}</b> đang gán cho {r._count.users} tài khoản – hãy chuyển họ sang vai trò khác trước, nếu không thao tác sẽ bị từ chối.</> : <>Vai trò <b>{r.name}</b> sẽ bị xóa (xóa mềm).</>,
                      } },
                    ]} />}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
      <ListState q={q} empty="Chưa có vai trò nào." />
      <Pagination data={q.data} prefix="r" fetching={q.isFetching} />
    </div>
  );
}
