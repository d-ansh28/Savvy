import { convexAuth } from "@convex-dev/auth/server";
import { emailPassword } from "./auth/emailPassword";
import { guest } from "./auth/guest";

export const { auth, signIn, signOut, store, isAuthenticated } = convexAuth({
  providers: [emailPassword, guest],
});
