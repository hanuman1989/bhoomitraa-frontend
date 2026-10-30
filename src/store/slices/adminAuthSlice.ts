import { createSlice, type PayloadAction } from "@reduxjs/toolkit";
import type { AdminUser } from "@/types/admin/adminUser";

export interface AdminAuthState {
  user: AdminUser | null;
  isAuthenticated: boolean;
}

const initialState: AdminAuthState = {
  user: null,
  isAuthenticated: false,
};

const adminAuthSlice = createSlice({
  name: "adminAuth",
  initialState,
  reducers: {
    setAdminAuth(state, action: PayloadAction<AdminUser>) {
      state.user = action.payload;
      state.isAuthenticated = true;
    },
    resetAdminAuth(state) {
      state.user = null;
      state.isAuthenticated = false;
    },
  },
});

export const { setAdminAuth, resetAdminAuth } = adminAuthSlice.actions;
export default adminAuthSlice.reducer;
