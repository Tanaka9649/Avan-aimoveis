import { NextRequest,NextResponse } from "next/server";
export function proxy(request:NextRequest){if(request.nextUrl.pathname.startsWith("/painel")&&!request.cookies.has("avan_session"))return NextResponse.redirect(new URL("/login",request.url));return NextResponse.next()}
export const config={matcher:["/painel/:path*"]};
