import { withAuth } from "next-auth/middleware";

export default withAuth({
  pages: { signIn: "/login" },
  callbacks: {
    authorized: ({ token, req }) => {
      if (!token?.sub || token.suspended) return false;
      if (req.nextUrl.pathname.startsWith("/admin")) return token.role === "ADMIN";
      if (req.nextUrl.pathname.startsWith("/host")) return token.role === "HOST" || token.role === "ADMIN";
      return true;
    },
  },
});

export const config = {
  matcher: ["/bookings/:path*", "/wishlist/:path*", "/checkout/:path*", "/host/:path*", "/admin/:path*"],
};
