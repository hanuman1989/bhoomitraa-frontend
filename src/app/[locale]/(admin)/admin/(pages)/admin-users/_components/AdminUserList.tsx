import type { AdminUser } from "@/types/admin/adminUser";
import { Menu, MenuButton, MenuItem, MenuItems } from "@headlessui/react";
import { MoreDotIcon, PencilIcon, PlusIcon, TrashBinIcon } from "@/icons";
import {
  Table,
  TableBody,
  TableCell,
  TableHeader,
  TableRow,
} from "@/components/admin/ui/table";

const headers = ["Name", "Email", "Mobile", "Status", "Created at", "Actions"];

const cellClasses =
  "whitespace-nowrap px-5 py-3 text-start text-sm text-[#53699b] dark:text-gray-400";

export default function AdminUserList({ users }: { users: AdminUser[] }) {
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
            Admin Users
          </h2>
        </div>
        <div className="flex gap-3">
          <button
            type="button"
            className="inline-flex h-11 shrink-0 items-center justify-center gap-2.5 rounded-md bg-[#004bff] px-4 text-sm leading-none font-medium whitespace-nowrap text-white transition hover:bg-blue-700 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-600"
          >
            <PlusIcon aria-hidden="true" className="block size-5 shrink-0" />
            <span>Add Admin</span>
          </button>
        </div>
      </div>
      <div className="overflow-x-auto">
        <Table className="w-full">
          <caption className="sr-only">
            Administrator accounts and access
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
                    className={`inline-flex rounded-full px-3.5 py-1 text-sm ${user.status === true ? "bg-emerald-50 text-emerald-700 dark:bg-emerald-500/15 dark:text-emerald-400" : "bg-slate-100 text-[#27386d] dark:bg-gray-800 dark:text-gray-300"}`}
                  >
                    {user.status === true ? "Active" : "Inactive"}
                  </span>
                </TableCell>

                <TableCell className={cellClasses}>{user.created_at}</TableCell>
                <TableCell className={cellClasses}>
                  <Menu>
                    <MenuButton
                      aria-label={`Actions for ${user.full_name}`}
                      className="flex size-9 items-center justify-center rounded-md text-[#0b164d] hover:bg-blue-50 focus-visible:outline-2 focus-visible:outline-blue-600 disabled:opacity-50 dark:text-gray-300 dark:hover:bg-gray-800"
                    >
                      <MoreDotIcon aria-hidden="true" className="size-6" />
                    </MenuButton>
                    <MenuItems
                      anchor="bottom end"
                      portal
                      className="z-99999 w-50 rounded-lg border border-[#dce3f1] bg-white p-1 shadow-lg [--anchor-gap:4px] focus:outline-none dark:border-gray-700 dark:bg-gray-900"
                    >
                      <MenuItem>
                        <button className="flex w-full items-center gap-2 rounded-md px-3 py-2 text-sm text-[#0b164d] data-focus:bg-blue-50 dark:text-gray-200 dark:data-focus:bg-gray-800">
                          <PencilIcon aria-hidden="true" className="size-5" />
                          Edit
                        </button>
                      </MenuItem>
                      <MenuItem>
                        <button className="flex w-full items-center gap-2 rounded-md px-3 py-2 text-sm text-[#0b164d] data-focus:bg-blue-50 dark:text-gray-200 dark:data-focus:bg-gray-800">
                          <PencilIcon aria-hidden="true" className="size-5" />
                          Change Password
                        </button>
                      </MenuItem>
                      <MenuItem>
                        <button
                          type="button"
                          className="flex w-full items-center gap-2 rounded-md px-3 py-2 text-sm text-red-600 data-focus:bg-red-50 dark:text-red-400 dark:data-focus:bg-gray-800"
                        >
                          <TrashBinIcon aria-hidden="true" className="size-5" />
                          Delete
                        </button>
                      </MenuItem>
                    </MenuItems>
                  </Menu>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
        {users.length === 0 && (
          <p className="p-8 text-center text-sm text-gray-500">
            No admin users match your filters.
          </p>
        )}
      </div>
    </section>
  );
}
