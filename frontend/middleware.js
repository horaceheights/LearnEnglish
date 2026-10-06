import { clerkMiddleware } from '@clerk/nextjs/server';
import { NextResponse } from 'next/server';

const authenticate = clerkMiddleware();
export default function middleware(request, event) {
  return process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY ? authenticate(request, event) : NextResponse.next();
}
export const config = { matcher: ['/((?!_next|[^?]*\\.(?:html?|css|js(?!on)|jpe?g|webp|png|gif|svg|ttf|woff2?|ico|csv|docx?|xlsx?|zip|webmanifest)).*)', '/(api|trpc)(.*)', '/__clerk/:path*'] };
