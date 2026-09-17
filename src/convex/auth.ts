import { convexAuth } from "@convex-dev/auth/server";
import { emailPassword } from "./auth/emailPassword";

export const { auth, signIn, signOut, store, isAuthenticated } = convexAuth({
  providers: [emailPassword],
});
