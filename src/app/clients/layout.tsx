import { AuthGuard } from "@/components/AuthGuard";

export default function ClientsLayout({ children }: { children: React.ReactNode }) {
  return <AuthGuard>{children}</AuthGuard>;
} 