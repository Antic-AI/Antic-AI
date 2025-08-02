import "./globals.css";

export const metadata = {
  title: "Antic Dashboard",
  description: "Real-time view of Antic’s trading engine",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
