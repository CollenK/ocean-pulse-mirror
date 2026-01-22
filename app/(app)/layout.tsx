export default function AppLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  // App pages get the bottom navigation from the root layout
  // This layout is for any app-specific wrappers needed in the future
  return <>{children}</>;
}
