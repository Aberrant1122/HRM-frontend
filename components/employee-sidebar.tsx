"use client";

import type * as React from "react";
import Link from "next/link";
import Image from "next/image";
import { usePathname, useRouter } from "next/navigation";
import {
  Building2,
  User,
  Clock,
  Calendar,
  FileText,
  Settings,
  LogOut,
  ChevronUp,
  ChevronRight,
  Home,
  Bell,
  CreditCard,
  ListChecks,
  ArrowRightLeft,
} from "lucide-react";

import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarRail,
  SidebarMenuSub,
  SidebarMenuSubItem,
  SidebarMenuSubButton,
  useSidebar,
} from "@/components/ui/sidebar";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import { useAuth } from "@/context/AuthContext";
import { useState, useEffect } from "react";
import { getUnreadNotificationCount } from "@/lib/actions/notification.actions";
import { Button } from "@/components/ui/button";

const data = {
  user: {
    name: "John Smith",
    email: "john@company.com",
    avatar: "JS",
  },
  navMain: [
    { title: "Employment records", url: "/employment-records", icon: FileText },
    { title: "Leave balances", url: "/leave-balances", icon: FileText },
    { title: "My HR tasks", url: "/hr-tasks", icon: FileText },
    { title: "HR task approvals", url: "/hr-task-approvals", icon: FileText },
    { title: "My policies and circulars", url: "/policies", icon: FileText },
    { title: "My assigned evaluations", url: "/reviews", icon: FileText },
    {
      title: "Dashboard",
      url: "/employee/dashboard",
      icon: Home,
    },
    {
      title: "My Profile",
      url: "/employee/profile",
      icon: User,
    },
    {
      title: "Bank Information",
      url: "/employee/bank-info",
      icon: CreditCard,
    },

    {
      title: "Attendance",
      url: "/employee/attendance",
      icon: Clock,
    },
    {
      title: "Leave Management",
      icon: Calendar,
      items: [
        {
          title: "Apply for Leave",
          url: "/employee/leave/apply",
          icon: Calendar,
        },
        {
          title: "My Leave Requests",
          url: "/employee/leave/requests",
          icon: FileText,
        },
        {
          title: "Leave Balance",
          url: "/employee/leave/balance",
          icon: CreditCard,
        },
      ],
    },
    {
      title: "My Tasks",
      url: "/employee/tasks",
      icon: ListChecks,
    },
    {
      title: "Payslips & Salary",
      url: "/employee/payroll",
      icon: FileText,
    },
    {
      title: "Notifications",
      url: "/employee/notifications",
      icon: Bell,
    },
  ],
};

export function EmployeeSidebar({
  ...props
}: React.ComponentProps<typeof Sidebar>) {
  const pathname = usePathname();
  const router = useRouter();
  const { user, logout, refreshProfile } = useAuth();
  const { setOpenMobile } = useSidebar();
  const [unreadCount, setUnreadCount] = useState(0);
  const [isProjectManager, setIsProjectManager] = useState(false);
  const [checkingManagerStatus, setCheckingManagerStatus] = useState(true);

  // Check if user is a project manager
  useEffect(() => {
    const checkManagerStatus = async () => {
      if (user?.id) {
        try {
          const token = localStorage.getItem("token");
          const apiUrl = process.env.NEXT_PUBLIC_API_URL || process.env.NEXT_PUBLIC_BACKEND_URL || 'http://localhost:5001/api';
          const response = await fetch(`${apiUrl}/auth/check-project-manager`, {
            headers: {
              Authorization: `Bearer ${token}`,
            },
          });
          const data = await response.json();
          if (data.success) {
            setIsProjectManager(data.isProjectManager);
            console.log('Project manager status:', data.isProjectManager);
          }
        } catch (error) {
          console.error("Failed to check manager status:", error);
        } finally {
          setCheckingManagerStatus(false);
        }
      } else {
        setCheckingManagerStatus(false);
      }
    };

    checkManagerStatus();
  }, [user?.id]);

  useEffect(() => {
    if (user?.id) {
      refreshProfile?.();
    }
  }, [user?.id, refreshProfile]);

  useEffect(() => {
    const fetchUnreadCount = async () => {
      if (user?.id) {
        try {
          const resp = await getUnreadNotificationCount();
          setUnreadCount(resp.count || 0);
        } catch (error) {
          console.error("Failed to fetch unread notifications count:", error);
        }
      }
    };

    fetchUnreadCount();

    // Set up interval to check for new notifications every 30 seconds
    const interval = setInterval(fetchUnreadCount, 30000);

    // Listen for notification read events
    const handleNotificationRead = () => {
      fetchUnreadCount();
    };

    window.addEventListener('notificationRead', handleNotificationRead);

    return () => {
      clearInterval(interval);
      window.removeEventListener('notificationRead', handleNotificationRead);
    };
  }, [user?.id]);

  const handleNotificationClick = () => {
    router.push("/employee/notifications");
  };

  const handleSwitchToManager = () => {
    router.push("/manager/dashboard");
    setOpenMobile(false);
  };

  return (
    <Sidebar collapsible="icon" {...props}>
      <SidebarHeader>
        <SidebarMenu>
          <SidebarMenuItem>
            <SidebarMenuButton size="lg" asChild>
              <Link href="/employee/dashboard" onClick={() => setOpenMobile(false)}>
                <div className="flex aspect-square size-8 items-center justify-center rounded-lg bg-blue-600 text-white">
                  <Building2 className="size-4" />
                </div>
                <div className="grid flex-1 text-left text-sm leading-tight">
                  <span className="truncate font-semibold">HRM System</span>
                  <span className="truncate text-xs">Employee Portal</span>
                </div>
              </Link>
            </SidebarMenuButton>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarHeader>
      <SidebarContent>
        {/* Debug info - remove after testing */}
        {process.env.NODE_ENV === 'development' && (
          <div className="px-3 py-1 text-xs text-gray-500">
            Manager Status: {checkingManagerStatus ? 'Checking...' : isProjectManager ? 'Yes' : 'No'}
          </div>
        )}

        {/* Professional Switcher Design */}
        {isProjectManager && !checkingManagerStatus && (
          <SidebarGroup className="py-2 px-2 my-1">
            <SidebarGroupContent>
              <SidebarMenu>
                <SidebarMenuItem>
                  <SidebarMenuButton
                    onClick={handleSwitchToManager}
                    className="w-full text-slate-700 hover:text-slate-900 hover:bg-slate-100 border border-slate-200 rounded-md transition-all duration-200 shadow-sm font-semibold bg-white"
                    tooltip="Switch to Manager Portal"
                  >
                    <div className="flex items-center justify-between w-full">
                      <div className="flex items-center gap-2">
                        <ArrowRightLeft className="h-4 w-4 text-slate-500" />
                        <span>View Manager Portal</span>
                      </div>
                      <ChevronRight className="h-3 w-3 text-slate-400" />
                    </div>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              </SidebarMenu>
            </SidebarGroupContent>
          </SidebarGroup>
        )}

        <SidebarGroup>
          <SidebarGroupLabel>Navigation</SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {data.navMain.map((item) => {
                if (item.items) {
                  return (
                    <Collapsible
                      key={item.title}
                      asChild
                      defaultOpen
                      className="group/collapsible"
                    >
                      <SidebarMenuItem>
                        <CollapsibleTrigger asChild>
                          <SidebarMenuButton tooltip={item.title}>
                            <item.icon />
                            <span>{item.title}</span>
                            <ChevronRight className="ml-auto transition-transform duration-200 group-data-[state=open]/collapsible:rotate-90" />
                          </SidebarMenuButton>
                        </CollapsibleTrigger>
                        <CollapsibleContent>
                          <SidebarMenuSub>
                            {item.items.map((subItem) => (
                              <SidebarMenuSubItem key={subItem.title}>
                                <SidebarMenuSubButton
                                  asChild
                                  isActive={pathname === subItem.url}
                                >
                                  <Link href={subItem.url} onClick={() => setOpenMobile(false)}>
                                    <subItem.icon />
                                    <span>{subItem.title}</span>
                                  </Link>
                                </SidebarMenuSubButton>
                              </SidebarMenuSubItem>
                            ))}
                          </SidebarMenuSub>
                        </CollapsibleContent>
                      </SidebarMenuItem>
                    </Collapsible>
                  );
                }
                return (
                  <SidebarMenuItem key={item.title}>
                    <SidebarMenuButton
                      asChild
                      tooltip={item.title}
                      isActive={pathname === item.url}
                    >
                      <Link href={item.url} onClick={() => setOpenMobile(false)}>
                        <item.icon />
                        <span>{item.title}</span>
                        {item.title === "Notifications" && unreadCount > 0 && (
                          <span
                            className="ml-auto flex h-5 w-5 items-center justify-center rounded-full bg-red-500 text-xs text-white cursor-pointer hover:bg-red-600"
                            onClick={(e) => {
                              e.preventDefault();
                              e.stopPropagation();
                              handleNotificationClick();
                              setOpenMobile(false);
                            }}
                          >
                            {unreadCount > 99 ? "99+" : unreadCount}
                          </span>
                        )}
                      </Link>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                );
              })}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>
      <SidebarFooter>
        <SidebarMenu>
          <SidebarMenuItem>
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <SidebarMenuButton
                  size="lg"
                  className="data-[state=open]:bg-sidebar-accent data-[state=open]:text-sidebar-accent-foreground"
                >
                  <Avatar className="h-8 w-8 rounded-full">
                    {user?.profilePicture && (
                      <Image
                        src={user.profilePicture}
                        alt={user?.fullName || "User"}
                        width={32}
                        height={32}
                        className="rounded-full object-cover"
                        unoptimized
                      />
                    )}
                    <AvatarFallback className="rounded-full bg-blue-100 text-blue-700">
                      {user?.fullName?.split(' ').map((n: string) => n[0]).join('').toUpperCase() || "??"}
                    </AvatarFallback>
                  </Avatar>
                  <div className="grid flex-1 text-left text-sm leading-tight">
                    <span className="truncate font-semibold">
                      {user?.fullName || "User Name"}
                    </span>
                    <span className="truncate text-xs">{user?.email || "user@example.com"}</span>
                  </div>
                  <ChevronUp className="ml-auto size-4" />
                </SidebarMenuButton>
              </DropdownMenuTrigger>
              <DropdownMenuContent
                className="w-[--radix-dropdown-menu-trigger-width] min-w-56 rounded-lg"
                side="top"
                align="end"
                sideOffset={4}
              >
                <DropdownMenuItem onClick={() => router.push("/employee/profile")}>
                  <Settings className="mr-2 h-4 w-4" />
                  Settings
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => logout()}>
                  <LogOut className="mr-2 h-4 w-4" />
                  Log out
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarFooter>
      <SidebarRail />
    </Sidebar>
  );
}
