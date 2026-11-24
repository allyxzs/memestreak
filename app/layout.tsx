import type { Metadata } from "next";
import "./globals.css";
export const metadata: Metadata = {
  title: "MemeStreak — um recomeço de cada vez",
  description:
    "Crie hábitos, celebre pequenas vitórias e transforme tropeços em memes. Sem culpa, com constância.",
  applicationName: "MemeStreak",
  icons: { icon: "/icon.svg" },
};
export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="pt-BR">
      <body>{children}</body>
    </html>
  );
}
