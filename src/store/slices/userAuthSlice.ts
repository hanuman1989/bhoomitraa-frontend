import { createSlice, type PayloadAction } from "@reduxjs/toolkit";
import type { FarmerUser } from "@/lib/userAuth/types";

export interface UserAuthState {
  user: FarmerUser | null;
  isAuthenticated: boolean;
  isLoading: boolean;
}
const initialState: UserAuthState = {
  user: null,
  isAuthenticated: false,
  isLoading: false,
};
const userAuthSlice = createSlice({
  name: "userAuth",
  initialState,
  reducers: {
    setUserAuth(state, action: PayloadAction<FarmerUser>) {
      state.user = action.payload;
      state.isAuthenticated = true;
      state.isLoading = false;
    },
    resetUserAuth() {
      return initialState;
    },
    setUserAuthLoading(state, action: PayloadAction<boolean>) {
      state.isLoading = action.payload;
    },
  },
});
export const { setUserAuth, resetUserAuth, setUserAuthLoading } =
  userAuthSlice.actions;
export default userAuthSlice.reducer;
