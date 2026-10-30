"use client";
import { useState } from "react";
import AdminUserFormDialog from "./AdminUserFormDialog";
export default function AddAdminButton() {
  const [open, setOpen] = useState(false);
  return <>
    <button type="button" onClick={() => setOpen(true)} className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700">+ Add Admin</button>
    {open && <AdminUserFormDialog open onClose={() => setOpen(false)} />}
  </>;
}
