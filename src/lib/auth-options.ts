import { AuthOptions } from "next-auth";
import GoogleProvider from "next-auth/providers/google";
import GithubProvider from "next-auth/providers/github";
import CredentialsProvider from "next-auth/providers/credentials";
import { UserRole } from "./auth";
import {
  isAdminEmail,
  resolveEffectiveRole,
  recordUserSignIn,
  getUsersList,
} from "./user-store";

export const authOptions: AuthOptions = {
  secret: process.env.AUTH_SECRET || process.env.NEXTAUTH_SECRET || "backlink-manager-production-secret-key-2026",
  session: {
    strategy: "jwt",
    maxAge: 30 * 24 * 60 * 60, // 30 days
  },
  pages: {
    signIn: "/login",
    error: "/login",
  },
  providers: [
    // 1. Google OAuth Provider (Active whenever credentials provided in env)
    ...(process.env.GOOGLE_CLIENT_ID && process.env.GOOGLE_CLIENT_SECRET
      ? [
          GoogleProvider({
            clientId: process.env.GOOGLE_CLIENT_ID,
            clientSecret: process.env.GOOGLE_CLIENT_SECRET,
            authorization: {
              params: {
                prompt: "consent",
                access_type: "offline",
                response_type: "code",
              },
            },
          }),
        ]
      : []),

    // 2. GitHub OAuth Provider (Optional)
    ...(process.env.GITHUB_ID && process.env.GITHUB_SECRET
      ? [
          GithubProvider({
            clientId: process.env.GITHUB_ID,
            clientSecret: process.env.GITHUB_SECRET,
          }),
        ]
      : []),

    // 3. Credentials Provider (For local development and password-based access)
    CredentialsProvider({
      id: "credentials",
      name: "Email and Password",
      credentials: {
        email: { label: "Email", type: "email", placeholder: "user@example.com" },
        password: { label: "Password", type: "password" },
      },
      async authorize(credentials) {
        if (!credentials?.email) {
          return null;
        }

        const email = credentials.email.toLowerCase().trim();

        // Register or retrieve user in persistent store
        const storedUser = await recordUserSignIn({
          email,
          name: email.split("@")[0],
        });

        // Ensure effective role strictly respects ADMIN_EMAILS allowlist
        const effectiveRole = resolveEffectiveRole(email, storedUser.role);

        return {
          id: storedUser.id,
          name: storedUser.name,
          email: storedUser.email,
          role: effectiveRole,
          image: storedUser.image,
        };
      },
    }),
  ],
  callbacks: {
    async signIn({ user }) {
      if (user?.email) {
        try {
          const stored = await recordUserSignIn({
            id: user.id,
            email: user.email,
            name: user.name ?? undefined,
            image: user.image ?? undefined,
          });
          user.role = stored.role;
        } catch (err) {
          console.warn("Could not record user sign-in:", err);
        }
      }
      return true;
    },

    async jwt({ token, user }) {
      if (user) {
        token.id = user.id;
        token.role = user.role || (token.email && isAdminEmail(token.email) ? "admin" : "viewer");
      }

      // Re-evaluate role on every token access against ADMIN_EMAILS and persistent store
      // This ensures immediate revocation if an admin is removed from ADMIN_EMAILS
      if (token.email) {
        token.role = resolveEffectiveRole(token.email, token.role as UserRole);
      }

      return token;
    },

    async session({ session, token }) {
      if (session?.user && token) {
        session.user.id = (token.id as string) || (token.sub as string);
        // Ensure session role matches current allowlist status
        const email = session.user.email || (token.email as string);
        session.user.role = email
          ? resolveEffectiveRole(email, token.role as UserRole)
          : (token.role as UserRole) || "viewer";
      }
      return session;
    },
  },
};
