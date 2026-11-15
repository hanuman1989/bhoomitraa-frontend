import { configureStore } from "@reduxjs/toolkit";
import adminAuthReducer, { type AdminAuthState } from "./slices/adminAuthSlice";
import userAuthReducer, { type UserAuthState } from "./slices/userAuthSlice";

export const makeStore = (
  initialAdminAuth?: AdminAuthState,
  initialUserAuth?: UserAuthState,
) =>
  configureStore({
    reducer: {
      adminUser: adminAuthReducer,
      webUser: userAuthReducer,
    },
    preloadedState: {
      adminUser:
        initialAdminAuth ?? adminAuthReducer(undefined, { type: "@@INIT" }),
      webUser:
        initialUserAuth ?? userAuthReducer(undefined, { type: "@@INIT" }),
    },
  });

export type AppStore = ReturnType<typeof makeStore>;
export type RootState = ReturnType<AppStore["getState"]>;
export type AppDispatch = AppStore["dispatch"];
