// NextAuth config - credentials auth (single user, personal app)

import NextAuth from "next-auth";
import Credentials from "next-auth/providers/credentials";

export const { handlers, signIn, signOut, auth } = NextAuth({
  providers: [
    Credentials({
      credentials: {
        username: { label: "Username", type: "text" },
        password: { label: "Password", type: "password" },
      },
      async authorize(credentials) {
        // Check against env variables (single user app)
        if (
          credentials?.username === process.env.AUTH_USER &&
          credentials?.password === process.env.AUTH_PASSWORD
        ) {
          return { id: "1", name: "Maria" };
        }
        return null;
      },
    }),
  ],
  pages: {
    signIn: "/login",
  },
});