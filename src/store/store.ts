import { configureStore } from "@reduxjs/toolkit";
import adminAuthReducer, { type AdminAuthState } from "./slices/adminAuthSlice";

export const makeStore = (initialAdminAuth?: AdminAuthState) =>
  configureStore({
    reducer: {
      adminUser: adminAuthReducer,
      // Add a separate `webUser` reducer here in the future.
    },
    preloadedState: initialAdminAuth
      ? { adminUser: initialAdminAuth }
      : undefined,
  });

export type AppStore = ReturnType<typeof makeStore>;
export type RootState = ReturnType<AppStore["getState"]>;
export type AppDispatch = AppStore["dispatch"];
