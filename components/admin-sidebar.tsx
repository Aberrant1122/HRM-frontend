"use client";

import React, { useEffect } from "react";
import Link from "next/link";
import Image from "next/image";
import { usePathname, useRouter } from "next/navigation";
import {
  Building2,
  Users,
  Clock,
  BarChart3,
  Settings,
  LogOut,
  ChevronUp,
  ChevronRight,
  User,
  UserPlus,
  Calendar,
  FileText,
  Home,
  FolderKanban,
  ListChecks,
  SquarePlus,
  Settings2,
  Timer,
  CalendarCheck,
  IdCard,
  Briefcase,
  CreditCard,
  LayoutGrid,
  UserCheck,
  UserSearch,
  TrendingUp,
  Phone,
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

const data = {
  navMain: [
    { title: "Consolidated record reports", url: "/admin/record-reports", icon: FileText },
    { title: "My policies and circulars", url: "/policies", icon: FileText },
    { title: "Policy publishing records", url: "/admin/policies", icon: FileText },
    { title: "My assigned evaluations", url: "/reviews", icon: FileText },
    {
      title: "Dashboard",
      url: "/admin/dashboard",
      icon: Home,
    },
    {
      title: "Employee Management",
      icon: Users,
      items: [
        {
          title: "All Employees",
          url: "/admin/employees",
          icon: Users,
        },
        {
          title: "Add Employee",
          url: "/admin/employees/add",
          icon: UserPlus,
        },
        {
          title: "Employee Profiles",
          url: "/admin/employees/profiles",
          icon: IdCard,
        },
        { title: "Onboarding", url: "/admin/onboarding", icon: ListChecks },
      ],
    },
    {
      title: "Attendance",
      icon: Clock,
      items: [
        {
          title: "Daily Attendance",
          url: "/admin/attendance",
          icon: Clock,
        },
        {
          title: "Daily Work Records",
          url: "/admin/daily-work-records",
          icon: FileText,
        },

        {
          title: "Time Tracking",
          url: "/admin/attendance/tracking",
          icon: Timer,
        },
      ],
    },
    {
      title: "Leave Management",
      icon: Calendar,
      items: [
        {
          title: "Leave Requests",
          url: "/admin/leave/requests",
          icon: CalendarCheck,
        },
        {
          title: "Leave Policies",
          url: "/admin/leave/policies",
          icon: FileText,
        },
      ],
    },
    {
      title: "Project Management",
      icon: FolderKanban,
      items: [
        {
          title: "All Projects",
          url: "/admin/projects/all-projects",
          icon: FolderKanban,
        },
        {
          title: "Add Project",
          url: "/admin/projects/add",
          icon: SquarePlus,
        },
        {
          title: "Manage Projects",
          url: "/admin/projects/manage-project",
          icon: Settings2,
        },
        {
          title: "Project Board",
          url: "/admin/kanban",
          icon: LayoutGrid,
        },
        {
          title: "Projects Reports ",
          url: "/admin/projects/project-reports",
          icon: BarChart3,
        },
      ],
    },
    {
      title: "Task Management",
      icon: ListChecks,
      items: [
        {
          title: "All Tasks",
          url: "/admin/tasks/all-tasks",
          icon: ListChecks,
        },
        {
          title: "Add Task",
          url: "/admin/tasks/add",
          icon: SquarePlus,
        },
        {
          title: "Manage Tasks",
          url: "/admin/tasks/manage-tasks",
          icon: Settings2,
        },
      ],
    },
    {
      title: "Client Management",
      icon: Briefcase,
      items: [
        {
          title: "All Clients",
          url: "/admin/clients",
          icon: Briefcase,
        },
        {
          title: "Add Client",
          url: "/admin/clients/add",
          icon: UserPlus,
        },
      ],
    },
    {
      title: "Payroll Management",
      icon: CreditCard,
      items: [
        {
          title: "Payroll Dashboard",
          url: "/admin/payroll",
          icon: BarChart3,
        },
        {
          title: "Payroll Profiles",
          url: "/admin/payroll/profiles",
          icon: IdCard,
        },
      ],
    },
    {
  title: "Lead Management",
  icon: TrendingUp,
  items: [
    {
      title: "All Leads",
      url: "/admin/leads/all-leads",
      icon: UserSearch,
    },
    {
      title: "Lead Pipeline",
      url: "/admin/leads/lead-pipeline",
      icon: BarChart3,
    },
    
   
  ],
},
  ],
};

export function AdminSidebar({
  ...props
}: React.ComponentProps<typeof Sidebar>) {
  const pathname = usePathname();
  const { user, logout, refreshProfile } = useAuth();
  const router = useRouter();
  const { setOpenMobile } = useSidebar();

  useEffect(() => {
    if (user?.id) {
      refreshProfile?.();
    }
  }, [user?.id, refreshProfile]);

  return (
    <Sidebar collapsible="icon" {...props}>
      <SidebarHeader>
        <SidebarMenu>
          <SidebarMenuItem>
            <SidebarMenuButton size="lg" asChild>
              <Link href="/admin/dashboard" onClick={() => setOpenMobile(false)}>
                <div className="flex aspect-square size-8 items-center justify-center rounded-lg bg-blue-600 text-white">
                  <Building2 className="size-4" />
                </div>
                <div className="grid flex-1 text-left text-sm leading-tight">
                  <span className="truncate font-semibold">HRM System</span>
                  <span className="truncate text-xs">Admin Panel</span>
                </div>
              </Link>
            </SidebarMenuButton>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarHeader>
      <SidebarContent>
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
                        alt={user?.name || user?.fullName || "User"}
                        width={32}
                        height={32}
                        className="rounded-full object-cover"
                        unoptimized
                      />
                    )}
                    <AvatarFallback className="rounded-full bg-blue-100 text-blue-700">
                      {(user?.name || user?.fullName)?.split(' ').map((n: string) => n[0]).join('').toUpperCase() || "A"}
                    </AvatarFallback>
                  </Avatar>
                  <div className="grid flex-1 text-left text-sm leading-tight">
                    <span className="truncate font-semibold">
                      {user?.name || user?.fullName || "Admin"}
                    </span>
                    <span className="truncate text-xs">{user?.email || "admin@example.com"}</span>
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
                <DropdownMenuItem onClick={() => router.push("/admin/dashboard")}>
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
