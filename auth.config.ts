import type { NextAuthConfig } from 'next-auth';
 
export const authConfig = {
  secret: process.env.AUTH_SECRET,
  providers: [],
  pages: {
    signIn: '/login',
  },
  callbacks: {
    authorized({ auth, request: { nextUrl, cookies } }) {
      const isLoggedIn = !!auth?.user || cookies.get("next-auth.session-token")?.value;
      const isOnDashboard = nextUrl.pathname.startsWith('/dashboard');
      // fix image
      if (nextUrl.pathname.indexOf("*.png")) {
        return true;
      }
      if (isOnDashboard) {
        if (isLoggedIn) return true;
        return false; // Redirect unauthenticated users to login page
      } else if (isLoggedIn) {
        return Response.redirect(new URL('/dashboard', nextUrl));
      }
      return true;
    },
  },
} satisfies NextAuthConfig;