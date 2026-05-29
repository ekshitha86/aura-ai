import { createFileRoute, Outlet, useNavigate } from "@tanstack/react-router";
import { useEffect } from "react";
import { Sidebar } from "@/components/Sidebar";
import { useAuth } from "@/lib/auth";

export const Route = createFileRoute("/_dash")({
  component: DashLayout,
});

function DashLayout() {
  const { user } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    // Wait one tick — AuthProvider hydrates from localStorage in an effect
    const t = setTimeout(() => {
      if (!user) navigate({ to: "/" });
    }, 50);
    return () => clearTimeout(t);
  }, [user, navigate]);

  return (
    <div className="flex min-h-screen w-full grid-bg">
      <Sidebar />
      <main className="flex-1 min-w-0 p-6 md:p-10">
        <Outlet />
      </main>
    </div>
  );
}