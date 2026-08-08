import type { Metadata } from "next";
import "./globals.css";
import "./spine-fix.css";
import AsinEnricher from "./AsinEnricher";

export const metadata: Metadata = {
  title: "Virtual Bookshelf",
  description: "A cozy visual bookshelf with Goodreads CSV import.",
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en">
      <body>
        {children}
        <AsinEnricher />
      </body>
    </html>
  );
}
