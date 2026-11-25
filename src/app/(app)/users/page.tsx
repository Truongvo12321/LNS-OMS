import { ShieldCheck, Users as UsersIcon } from "lucide-react";
import { alive, db, guardPage } from "@/lib/db";
import { Flash } from "@/components/ui";
import { FormModal, Tabs } from "@/components/client";
import UserForm from "./UserForm";
import RoleForm from "./RoleForm";
import { RoleList, UserList } from "./List";

export const dynamic = "force-dynamic";

export default async function Users({ searchParams }: { searchParams: Promise<Record<string, string>> }) {
  const me = await guardPage("users.manage");
  const sp = await searchParams;
  const meIsAdmin = me.role.isAdmin;
  const [roles, found, editRole] = await Promise.all([
    db.role.findMany({ where: alive, orderBy: [{ isAdmin: "desc" }, { id: "asc" }], select: { id: true, name: true, isAdmin: true, permissions: true, description: true } }),
    sp.edit ? db.user.findFirst({ where: { id: Number(sp.edit), ...alive }, select: { id: true, name: true, email: true, roleId: true, role: { select: { isAdmin: true } } } }) : null,
    sp.editRole ? db.role.findFirst({ where: { id: Number(sp.editRole), isAdmin: false, ...alive } }) : null,
  ]);
  const edit = found && (meIsAdmin || !found.role.isAdmin) ? found : null; // không lộ form sửa tài khoản Quản trị cho người không phải Quản trị
  const assignable = roles.filter((r) => meIsAdmin || !r.isAdmin);
  const rev = Date.now();

  return (
    <div>
      <div className="mb-4">
        <h1 className="h1 mb-1">Phân quyền</h1>
        <p className="text-slate-500">Tạo vai trò gồm các quyền, rồi gán vai trò cho từng tài khoản.</p>
      </div>
      <Flash sp={sp} />
      <Tabs tabs={[
        {
          key: "accounts", label: <><UsersIcon aria-hidden size={16} />Tài khoản</>,
          content: (
            <>
              <div className="page-head mb-3 justify-end">
                <FormModal trigger="Thêm tài khoản" title={edit ? `Sửa tài khoản ${edit.name}` : "Thêm tài khoản"} open={!!edit} wide>
                  <UserForm key={edit?.id ?? "new"} edit={edit} roles={assignable} isSelf={edit?.id === me.id} />
                </FormModal>
              </div>
              <UserList rev={rev} roles={roles.map((r) => [r.id, r.name])} />
            </>
          ),
        },
        {
          key: "roles", label: <><ShieldCheck aria-hidden size={16} />Vai trò</>,
          content: (
            <>
              <div className="page-head mb-3 justify-end">
                <FormModal trigger="Thêm vai trò" title={editRole ? `Sửa vai trò ${editRole.name}` : "Thêm vai trò"} open={!!editRole} param="editRole" wide>
                  <RoleForm key={editRole?.id ?? "new"} edit={editRole} />
                </FormModal>
              </div>
              <RoleList rev={rev} />
            </>
          ),
        },
      ]} />
    </div>
  );
}
