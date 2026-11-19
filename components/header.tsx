"use client";

import { LogOut } from "lucide-react";
import { Button } from "@/components/ui/button";
import { SidebarTrigger } from "@/components/ui/sidebar";
import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from "@/components/ui/breadcrumb";
import { Separator } from "@/components/ui/separator";
import { useAuth } from "@/context/AuthContext";
import {PolicyChangeAlert} from '@/components/policy-change-alert';
import { CorrectionLink } from '@/components/attendance/CorrectionLink';
import {AttendanceClockAlerts} from '@/components/attendance-clock-alerts';

interface PageHeaderProps {
  breadcrumbs: Array<{
    label: string;
    href?: string;
  }>;
}

export function Header({ breadcrumbs }: PageHeaderProps) {
  const { user, logout } = useAuth();

  const handleSignOut = () => {
    console.log("Sign out button clicked");
    logout();
    // router.push("/login");
  };

  return (
    <header className="flex h-16 shrink-0 items-center justify-between border-b px-4">
      <div className="flex items-center gap-2">
        <SidebarTrigger className="-ml-1" />
        <Separator orientation="vertical" className="mr-2 h-4" />
        <Breadcrumb>
          <BreadcrumbList>
            {breadcrumbs.map((crumb, index) => (
              <div key={crumb.label} className="flex items-center">
                {index > 0 && (
                  <BreadcrumbSeparator className="hidden md:block" />
                )}
                <BreadcrumbItem
                  className={index === 0 ? "hidden md:block" : ""}
                >
                  {crumb.href ? (
                    <BreadcrumbLink href={crumb.href}>
                      {crumb.label}
                    </BreadcrumbLink>
                  ) : (
                    <BreadcrumbPage>{crumb.label}</BreadcrumbPage>
                  )}
                </BreadcrumbItem>
              </div>
            ))}
          </BreadcrumbList>
        </Breadcrumb>
      </div>
      <div className="flex items-center gap-4">
        {user?.id&&["admin","manager","employee"].includes(user.role)&&<PolicyChangeAlert key={user.id}/>}<CorrectionLink /><AttendanceClockAlerts/>
        {user?.id&&["admin","manager","employee","hr"].includes(user.role)&&<a href="/probation-feedback" className="text-sm underline">My probation feedback</a>}{user?.role === 'admin' && <a href="/admin/probation" className="text-sm underline">Probation</a>}
        {user?.role === 'admin' && <a href="/admin/organization" className="text-sm underline">Organization</a>}
        {user && (
          <span className="hidden md:inline text-sm text-muted-foreground">
            {user.email}
          </span>
        )}
        <Button
          variant="ghost"
          size="sm"
          className="flex items-center gap-2"
          onClick={handleSignOut}
        >
          <LogOut className="h-4 w-4" />
          <span className="hidden sm:inline">Sign out</span>
        </Button>
      </div>
    </header>
  );
}
