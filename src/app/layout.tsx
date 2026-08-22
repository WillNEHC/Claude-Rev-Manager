import type { ReactNode } from "react";
import "./globals.css";

export const metadata = {
  title: "GDIP — Guest Demand Intelligence",
  description: "Market-research intelligence for luxury NH short-term rentals.",
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="en">
      <body>
        <header className="nav">
          <span className="brand">GDIP</span>
          <nav>
            <a href="/">Overview</a>
            <a href="/recommendations">Recommendations</a>
            <a href="/search">Ask</a>
            <a href="/compare">Compare</a>
          </nav>
        </header>
        <main>{children}</main>
      </body>
    </html>
  );
}
