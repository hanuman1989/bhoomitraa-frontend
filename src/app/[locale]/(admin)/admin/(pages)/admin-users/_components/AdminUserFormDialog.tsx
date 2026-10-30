"use client";

import { useState, type FormEvent } from "react";
import { useRouter } from "@/i18n/navigation";
import ActionDialog from "@/components/admin/common/ActionDialog";
import { createAdminUser, updateAdminUser } from "@/actions/admin/adminUsers";
import type {
  AdminUserForActions, AdminUserFormValues, CreateAdminUserValues, FieldErrors,
} from "@/types/admin/adminUserMutations";

const inputClass = "w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm text-gray-900 focus:border-blue-500 focus:outline-none dark:border-gray-700 dark:bg-gray-800 dark:text-white";
const empty: AdminUserFormValues = {
  first_name: "", last_name: "", email: "", mobile: "", status: true, is_super_user: false,
};

export default function AdminUserFormDialog({ open, onClose, user }: {
  open: boolean;
  onClose: () => void;
  user?: AdminUserForActions;
}) {
  const router = useRouter();
  const [values, setValues] = useState<AdminUserFormValues>(() => user ? {
    first_name: user.first_name, last_name: user.last_name, email: user.email,
    mobile: user.mobile ?? "", status: user.status, is_super_user: user.is_super_user,
  } : { ...empty });
  const [password, setPassword] = useState("");
  const [confirmation, setConfirmation] = useState("");
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");
  const [errors, setErrors] = useState<FieldErrors>({});

  const field = (name: keyof AdminUserFormValues, label: string, required = false) => (
    <label className="block text-sm text-gray-700 dark:text-gray-200">
      <span className="mb-1 block font-medium">{label}</span>
      <input required={required} className={inputClass} type={name === "email" ? "email" : "text"}
        value={String(values[name])} onChange={(e) => setValues((prev) => ({ ...prev, [name]: e.target.value }))} />
      {errors[name]?.[0] && <span className="text-xs text-red-600">{errors[name][0]}</span>}
    </label>
  );

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (busy) return;
    setBusy(true); setMessage(""); setErrors({});
    try {
      const result = user
        ? await updateAdminUser(user.id, values)
        : await createAdminUser({ ...values, password, password_confirmation: confirmation } satisfies CreateAdminUserValues);
      if (!result.success) { setMessage(result.message); setErrors(result.errors ?? {}); return; }
      onClose();
      router.refresh();
    } catch { setMessage("Unable to save. Please try again."); }
    finally { setBusy(false); }
  }

  return (
    <ActionDialog open={open} onClose={onClose} busy={busy} title={user ? "Edit Admin User" : "Add Admin User"}>
      <form onSubmit={submit} className="space-y-4">
        {message && <p role="alert" className="rounded-lg bg-red-50 p-3 text-sm text-red-700">{message}</p>}
        <div className="grid grid-cols-2 gap-3">{field("first_name", "First name", true)}{field("last_name", "Last name", true)}</div>
        {field("email", "Email address", true)}
        {field("mobile", "Mobile number")}
        {!user && <>
          <label className="block text-sm"><span className="mb-1 block font-medium">Password</span>
            <input className={inputClass} type="password" autoComplete="new-password" minLength={8} required value={password} onChange={(e) => setPassword(e.target.value)} />
            {errors.password?.[0] && <span className="text-xs text-red-600">{errors.password[0]}</span>}
          </label>
          <label className="block text-sm"><span className="mb-1 block font-medium">Confirm password</span>
            <input className={inputClass} type="password" autoComplete="new-password" minLength={8} required value={confirmation} onChange={(e) => setConfirmation(e.target.value)} />
            {errors.password_confirmation?.[0] && <span className="text-xs text-red-600">{errors.password_confirmation[0]}</span>}
          </label>
        </>}
        <div className="flex flex-wrap gap-5 text-sm">
          <label className="flex items-center gap-2"><input type="checkbox" checked={values.status} onChange={(e) => setValues((prev) => ({ ...prev, status: e.target.checked }))} /> Active</label>
          <label className="flex items-center gap-2"><input type="checkbox" checked={values.is_super_user} onChange={(e) => setValues((prev) => ({ ...prev, is_super_user: e.target.checked }))} /> Super Admin</label>
        </div>
        <div className="flex justify-end gap-3 pt-3">
          <button type="button" disabled={busy} onClick={onClose} className="rounded-lg border px-4 py-2 text-sm">Cancel</button>
          <button type="submit" disabled={busy} className="rounded-lg bg-blue-600 px-5 py-2 text-sm text-white disabled:opacity-50">{busy ? "Saving..." : user ? "Save Changes" : "Add Admin"}</button>
        </div>
      </form>
    </ActionDialog>
  );
}
