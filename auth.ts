import { auth } from "@/auth";

export default auth((req) => {
  const isAuth = !!req.auth;
  const isAuthPage = req.nextUrl.pathname.startsWith("/login") || req.nextUrl.pathname.startsWith("/auth");
  const isDashboard = req.nextUrl.pathname.startsWith("/dashboard") || req.nextUrl.pathname.startsWith("/admin");

  if (!isAuth && isDashboard) {
    return Response.redirect(new URL("/login", req.nextUrl));
  }

  if (isAuth && isAuthPage) {
    return Response.redirect(new URL("/dashboard", req.nextUrl));
  }
});

export const config = {
  matcher: ["/dashboard/:path*", "/admin/:path*", "/login", "/auth/:path*"],
};
