"use client";
import { useState } from "react";

import { Menu, MenuButton, MenuItem, MenuItems } from "@headlessui/react";
import { MoreDotIcon, PencilIcon, TrashBinIcon } from "@/icons";
import { useModal } from "@/hooks/useModal";
import type { AdminUser } from "@/types/admin/adminUser";
import AdminUserForm from "./AdminUserForm";
import AdminUserDeleteConfirm from "./AdminUserDeleteConfirm";
import UpdatePassword from "./UpdatePassword";
import { useTranslations } from "next-intl";

type UserEditorState = {
  user: AdminUser | null;
};

export default function ActionButtons({ user }: { user: AdminUser }) {
  const tUi = useTranslations("adminUsers.actions");

  const [editor, setEditor] = useState<UserEditorState | null>(null);
  const [deleteUser, setDeleteUser] = useState<UserEditorState | null>(null);
  const {
    isOpen: isPasswordOpen,
    openModal: openPasswordModal,
    closeModal: closePasswordModal,
  } = useModal();

  return (
    <>
      <Menu>
        <MenuButton
          aria-label={tUi("actionsFor", { name: user.full_name })}
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
            <button
              onClick={() => setEditor({ user: user })}
              className="flex w-full items-center gap-2 rounded-md px-3 py-2 text-sm text-[#0b164d] data-focus:bg-blue-50 dark:text-gray-200 dark:data-focus:bg-gray-800"
            >
              <PencilIcon aria-hidden="true" className="size-5" />
              {tUi("edit")}
            </button>
          </MenuItem>
          <MenuItem>
            <button
              onClick={openPasswordModal}
              className="flex w-full items-center gap-2 rounded-md px-3 py-2 text-sm text-[#0b164d] data-focus:bg-blue-50 dark:text-gray-200 dark:data-focus:bg-gray-800"
            >
              <PencilIcon aria-hidden="true" className="size-5" />
              {tUi("changePassword")}
            </button>
          </MenuItem>
          <MenuItem>
            <button
              type="button"
              onClick={() => setDeleteUser({ user: user })}
              className="flex w-full items-center gap-2 rounded-md px-3 py-2 text-sm text-red-600 data-focus:bg-red-50 dark:text-red-400 dark:data-focus:bg-gray-800"
            >
              <TrashBinIcon aria-hidden="true" className="size-5" />
              {tUi("delete")}
            </button>
          </MenuItem>
        </MenuItems>
      </Menu>
      {editor && (
        <AdminUserForm
          key={editor.user?.id ?? "new"}
          user={editor.user}
          onClose={() => setEditor(null)}
        />
      )}
      {deleteUser?.user && (
        <AdminUserDeleteConfirm
          key={deleteUser.user?.id ?? "delete"}
          user={deleteUser.user}
          onClose={() => setDeleteUser(null)}
        />
      )}
      {isPasswordOpen && (
        <UpdatePassword
          key={user.id}
          user={user}
          onClose={closePasswordModal}
        />
      )}
    </>
  );
}
