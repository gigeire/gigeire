import { AuthGuard } from "@/components/AuthGuard";

export default function GigDetailLayout({ children }: { children: React.ReactNode }) {
  return <AuthGuard>{children}</AuthGuard>;
} 