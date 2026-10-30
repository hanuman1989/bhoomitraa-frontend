"use client";

import { Toaster } from "react-hot-toast";

export default function AdminToaster() {
  return (
    <Toaster position="bottom-center" toastOptions={{
      success: { style: { background: "green", color: "#FFF" } },
      error: { style: { background: "red", color: "#FFF" } },
    }} />
  );
}
