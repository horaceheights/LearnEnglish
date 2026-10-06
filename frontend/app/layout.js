import "./globals.css";
import { ClerkProvider } from '@clerk/nextjs';

export const metadata = {
  title: "Learn English Lab",
  description: "Rosetta-style ESL prototype for Spanish-speaking learners.",
};

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <body>{process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY ? <ClerkProvider>{children}</ClerkProvider> : children}</body>
    </html>
  );
}
