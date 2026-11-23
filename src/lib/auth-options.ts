import { AuthOptions } from "next-auth";
import GoogleProvider from "next-auth/providers/google";
import GithubProvider from "next-auth/providers/github";
import CredentialsProvider from "next-auth/providers/credentials";
import { UserRole } from "./auth";

export const authOptions: AuthOptions = {
  secret: process.env.AUTH_SECRET || process.env.NEXTAUTH_SECRET || "backlink-manager-production-secret-key-2026",
  session: {
    strategy: "jwt",
    maxAge: 30 * 24 * 60 * 60, // 30 days
  },
  pages: {
    signIn: "/login",
  },
  providers: [
    // 1. Google OAuth Provider
    ...(process.env.GOOGLE_CLIENT_ID && process.env.GOOGLE_CLIENT_SECRET
      ? [
          GoogleProvider({
            clientId: process.env.GOOGLE_CLIENT_ID,
            clientSecret: process.env.GOOGLE_CLIENT_SECRET,
          }),
        ]
      : []),

    // 2. GitHub OAuth Provider
    ...(process.env.GITHUB_ID && process.env.GITHUB_SECRET
      ? [
          GithubProvider({
            clientId: process.env.GITHUB_ID,
            clientSecret: process.env.GITHUB_SECRET,
          }),
        ]
      : []),

    // 3. Credentials & Quick Access Role Sign-in
    CredentialsProvider({
      name: "Email and Password",
      credentials: {
        email: { label: "Email", type: "email", placeholder: "user@example.com" },
        password: { label: "Password", type: "password" },
        role: { label: "Role", type: "text" },
      },
      async authorize(credentials) {
        if (!credentials?.email) {
          return null;
        }

        const email = credentials.email.toLowerCase().trim();
        const role = (credentials.role as UserRole) || (email.includes("admin") ? "admin" : "editor");

        // Recognized predefined test profiles
        if (email === "arsal73500@gmail.com" || email === "admin@backlinkmanager.com") {
          return {
            id: "usr_admin_arsal",
            name: "Arsal Malik",
            email: "arsal73500@gmail.com",
            role: "admin",
            image: "https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=100&auto=format&fit=crop&q=80",
          };
        }

        if (email === "editor@backlinkmanager.com") {
          return {
            id: "usr_editor_1",
            name: "SEO Team Editor",
            email: "editor@backlinkmanager.com",
            role: "editor",
            image: "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=100&auto=format&fit=crop&q=80",
          };
        }

        if (email === "viewer@backlinkmanager.com") {
          return {
            id: "usr_viewer_1",
            name: "Client Viewer",
            email: "viewer@backlinkmanager.com",
            role: "viewer",
            image: "https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=100&auto=format&fit=crop&q=80",
          };
        }

        // Generic email sign in
        return {
          id: `usr_${Date.now()}`,
          name: email.split("@")[0],
          email,
          role,
        };
      },
    }),
  ],
  callbacks: {
    async jwt({ token, user, trigger, session }) {
      if (user) {
        token.role = (user as any).role || "admin";
        token.id = user.id;
      }
      if (trigger === "update" && session?.role) {
        token.role = session.role;
      }
      return token;
    },
    async session({ session, token }) {
      if (session.user) {
        (session.user as any).role = token.role || "admin";
        (session.user as any).id = token.id || token.sub;
      }
      return session;
    },
  },
};
