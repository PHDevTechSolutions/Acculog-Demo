"use client";

import * as React from "react";
import { Plus, LayoutDashboard, FileText, Clock } from "lucide-react";

import { Calendars } from "@/components/calendars";
import { DatePicker } from "@/components/date-picker";
import { NavUser } from "@/components/nav-user";
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarRail,
  SidebarSeparator,
} from "@/components/ui/sidebar";

import { type DateRange } from "react-day-picker";

type AppSidebarProps = React.ComponentProps<typeof Sidebar> & {
  userId?: string;
  dateCreatedFilterRange: DateRange | undefined;
  setDateCreatedFilterRangeAction: React.Dispatch<React.SetStateAction<DateRange | undefined>>;
};

export function AppSidebar({
  userId,
  dateCreatedFilterRange,
  setDateCreatedFilterRangeAction,
  ...props
}: AppSidebarProps) {
  const [userDetails, setUserDetails] = React.useState({
    Firstname: "",
    Lastname: "",
    Email: "",
    profilePicture: "",
  });

  React.useEffect(() => {
    if (!userId) return;

    fetch(`/api/user?id=${encodeURIComponent(userId)}`)
      .then((res) => res.json())
      .then((data) =>
        setUserDetails({
          Firstname: data.Firstname || "",
          Lastname: data.Lastname || "",
          Email: data.Email || "",
          profilePicture: data.profilePicture || "",
        })
      )
      .catch((err) => console.error(err));
  }, [userId]);

  const calendars = React.useMemo(
    () => [
      {
        name: "Menu",
        items: [
          {
            title: "Dashboard",
            href: `/dashboard${userId ? `?id=${encodeURIComponent(userId)}` : ""}`,
            icon: LayoutDashboard,
          },
          {
            title: "Location",
            href: `/location${userId ? `?id=${encodeURIComponent(userId)}` : ""}`,
            icon: LayoutDashboard,
          },
          {
            title: "Activity Logs",
            href: `/activity${userId ? `?id=${encodeURIComponent(userId)}` : ""}`,
            icon: FileText,
          },
          {
            title: "Timesheet",
            href: `/timesheet${userId ? `?id=${encodeURIComponent(userId)}` : ""}`,
            icon: Clock,
          },
        ],
      },
    ],
    [userId]
  );

  function handleDateRangeSelect(range: DateRange | undefined) {
    setDateCreatedFilterRangeAction(range);
  }

  return (
    <Sidebar {...props}>
      <SidebarHeader className="border-sidebar-border h-16 border-b">
        {userId && (
          <NavUser
            user={{
              name: `${userDetails.Firstname} ${userDetails.Lastname}`.trim(),
              email: userDetails.Email,
              avatar: userDetails.profilePicture,
            }}
            userId={userId}
          />
        )}
      </SidebarHeader>

      <SidebarContent>
        <DatePicker
          selectedDateRange={dateCreatedFilterRange}
          onDateSelectAction={handleDateRangeSelect}
        />
        <SidebarSeparator className="mx-0" />
        <Calendars calendars={calendars} />
      </SidebarContent>

      <SidebarFooter>
        <SidebarMenu>
          <SidebarMenuItem>
            <SidebarMenuButton>
              <Plus />
              <span>New Calendar</span>
            </SidebarMenuButton>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarFooter>

      <SidebarRail />
    </Sidebar>
  );
}
