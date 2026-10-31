"use client";

import { useState } from "react";
import type { AdminUser } from "@/types/admin/adminUser";
import AdminUserForm from "./AdminUserForm";
import ActionButtons from "./ActionButtons";
import { PlusIcon } from "@/icons";
import {
  Table,
  TableBody,
  TableCell,
  TableHeader,
  TableRow,
} from "@/components/admin/ui/table";
import { useTranslations } from "next-intl";

type UserEditorState = {
  user: AdminUser | null;
};

const cellClasses =
  "whitespace-nowrap px-5 py-3 text-start text-sm text-[#53699b] dark:text-gray-400";

export default function AdminUserList({ users }: { users: AdminUser[] }) {
  const tUi = useTranslations("adminUsers.list");
  const headers = [
    tUi("name"),
    tUi("email"),
    tUi("mobile"),
    tUi("status"),
    tUi("createdAt"),
    tUi("actions"),
  ];

  const [editor, setEditor] = useState<UserEditorState | null>(null);

  return (
    <section
      aria-labelledby="admin-users-table-title"
      className="overflow-hidden rounded-xl border border-[#dce3f1] bg-white dark:border-gray-800 dark:bg-gray-900"
    >
      <div className="flex flex-wrap items-center justify-between gap-4 px-5 py-4 md:px-6">
        <div className="flex items-center gap-3">
          <h2
            id="admin-users-table-title"
            className="text-xl font-semibold md:text-2xl"
          >
            {tUi("adminUsers")}
          </h2>
        </div>
        <div className="flex gap-3">
          <button
            type="button"
            onClick={() => setEditor({ user: null })}
            className="inline-flex h-11 shrink-0 items-center justify-center gap-2.5 rounded-md bg-[#004bff] px-4 text-sm leading-none font-medium whitespace-nowrap text-white transition hover:bg-blue-700 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-600"
          >
            <PlusIcon aria-hidden="true" className="block size-3 shrink-0" />
            <span>{tUi("addAdmin")}</span>
          </button>
        </div>
      </div>
      <div className="overflow-x-auto">
        <Table className="w-full">
          <caption className="sr-only">
            {tUi("administratorAccountsAndAccess")}
          </caption>
          <TableHeader className="border-y border-[#e6ebf5] bg-[#f3f6fb] dark:border-gray-800 dark:bg-gray-800/50">
            <TableRow>
              {headers.map((header) => (
                <TableCell
                  key={header}
                  isHeader
                  className="px-5 py-3 text-start text-xs font-medium whitespace-nowrap text-[#53699b] uppercase dark:text-gray-400"
                >
                  {header}
                </TableCell>
              ))}
            </TableRow>
          </TableHeader>
          <TableBody className="divide-y divide-[#e6ebf5] dark:divide-gray-800">
            {users.map((user) => (
              <TableRow
                key={user.id}
                className="transition-colors hover:bg-gray-50/70 dark:hover:bg-gray-800/30"
              >
                <TableCell className={`${cellClasses} font-medium`}>
                  <div className="flex items-center gap-4">
                    <span className="text-[#0b164d] dark:text-gray-100">
                      {user.full_name}
                    </span>
                  </div>
                </TableCell>
                <TableCell className={cellClasses}>{user.email}</TableCell>
                <TableCell className={cellClasses}>
                  {user.mobile || "—"}
                </TableCell>
                <TableCell className={cellClasses}>
                  <span
                    className={`inline-flex rounded-full px-3.5 py-1 text-sm ${user.status == 1 ? "bg-emerald-50 text-emerald-700 dark:bg-emerald-500/15 dark:text-emerald-400" : "bg-slate-100 text-[#27386d] dark:bg-gray-800 dark:text-gray-300"}`}
                  >
                    {user.status == 1 ? tUi("active") : tUi("inactive")}
                  </span>
                </TableCell>

                <TableCell className={cellClasses}>{user.added_at}</TableCell>
                <TableCell className={cellClasses}>
                  <ActionButtons user={user} />
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
        {users.length === 0 && (
          <p className="p-8 text-center text-sm text-gray-500">
            {tUi("noAdminUsersMatchYourFilters")}
          </p>
        )}
      </div>
      {editor && (
        <AdminUserForm
          key={editor.user?.id ?? "new"}
          user={editor.user}
          onClose={() => setEditor(null)}
        />
      )}
    </section>
  );
}
