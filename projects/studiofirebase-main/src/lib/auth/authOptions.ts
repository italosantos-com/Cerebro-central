import { NextAuthOptions } from 'next-auth';
import GoogleProvider from "next-auth/providers/google";
import AppleProvider from "next-auth/providers/apple";
import { FirestoreAdapter } from "@next-auth/firebase-adapter";
import { getAdminDb } from "@/lib/firebase-admin";

export const authOptions: NextAuthOptions = {
  adapter: (() => {
    const adminDb = getAdminDb();
    return adminDb ? FirestoreAdapter(adminDb as any) : undefined;
  })(),
  session: {
    strategy: getAdminDb() ? 'database' : 'jwt',
  },
  providers: [
    GoogleProvider({
      clientId: process.env.GOOGLE_CLIENT_ID!,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET!,
    }),
    AppleProvider({
      clientId: process.env.APPLE_CLIENT_ID!,
      clientSecret: process.env.APPLE_CLIENT_SECRET!,
    }),
  ],
  callbacks: {
    async jwt({ token, user }) {
      if (user) {
        // Persistir o id no JWT quando estiver em estratégia 'jwt'
        (token as any).id = (user as any).id;
        (token as any).role = (user as any).role;
      }
      return token;
    },
    async session({ session, user, token }) {
      if (session?.user) {
        // Estratégia database: vem em `user` | Estratégia jwt: vem em `token`
        const resolvedId = (user as any)?.id || (token as any)?.id;
        const resolvedRole = (user as any)?.role || (token as any)?.role;

        if (resolvedId) {
          session.user.id = resolvedId;
        }
        if (resolvedRole) {
          // @ts-ignore
          session.user.role = resolvedRole;
        }
      }
      return session;
    }
  },
  pages: {
    signIn: '/login', // Página de login customizada
  },
};
