"use client";

import { authApi } from "@/modules/auth/services/auth";
import { useAuthStore } from "@/modules/auth/store/authStore";
import {
  DashboardShell,
  type DashboardNavItem,
} from "@/modules/shared/components/dashboard/DashboardShell";
import { toast } from "@/lib/toast";
import { useRouter } from "next/navigation";
import {
  Building2,
  Calendar,
  CreditCard,
  LayoutDashboard,
  Settings,
  Users,
} from "lucide-react";
import React, { useEffect } from "react";

export default function AcademyLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const router = useRouter();
  const { user, logout } = useAuthStore();

  useEffect(() => {
    if (user && user.role !== "ACADEMY_OWNER") {
      toast.error("Academy access is limited to academy owners.");
      router.replace("/");
    }
  }, [router, user]);

  const handleLogout = async () => {
    try {
      await authApi.logout();
    } catch (error) {
      console.error("Logout failed:", error);
    } finally {
      logout();
      router.push("/");
    }
  };

  const navItems: DashboardNavItem[] = [
    {
      href: "/academy",
      label: "Dashboard",
      icon: LayoutDashboard,
    },
    {
      href: "/academies",
      label: "Public Profile",
      icon: Building2,
    },
    {
      href: "/academy/venues",
      label: "Venues",
      icon: Building2,
    },
    {
      href: "/academy/coaches",
      label: "Coaches",
      icon: Users,
    },
    {
      href: "/academy/plans",
      label: "Plans",
      icon: CreditCard,
    },
    {
      href: "/academy/bookings",
      label: "Bookings",
      icon: Calendar,
    },
    {
      href: "/academy/settings",
      label: "Settings",
      icon: Settings,
    },
  ];

  return (
    <DashboardShell
      dashboardLabel="Academy Owner Dashboard"
      userName={user?.name}
      navItems={navItems}
      onLogout={handleLogout}
    >
      {children}
    </DashboardShell>
  );
}
