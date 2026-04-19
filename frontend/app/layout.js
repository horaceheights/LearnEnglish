import "./globals.css";

export const metadata = {
  title: "Learn English Lab",
  description: "Rosetta-style ESL prototype for Spanish-speaking learners.",
};

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
