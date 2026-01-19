"use client";

import * as React from "react";
import { Plus, LayoutDashboard, FileText, Clock, MapPin, ClipboardList, Briefcase, Users, UserCheck } from "lucide-react";

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
import { collection, query, where, onSnapshot } from "firebase/firestore";
import { db } from "@/lib/firebase"; // make sure path is correct

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
    Position: "",
  });

  const [jobPostingCount, setJobPostingCount] = React.useState(0);
  const [applicationCount, setApplicationCount] = React.useState(0);

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
          Position: data.Position || "",
        })
      )
      .catch((err) => console.error(err));
  }, [userId]);

  const allowedPositions = [
    "HR Associate",
    "HR Manager",
    "HR Supervisor",
    "Senior Fullstack Developer",
    "Fullstack Developer",
  ];

  React.useEffect(() => {
    if (!userId) return;

    // Query Job Postings count (assuming 'job-postings' is your collection)
    const jobPostingQ = query(collection(db, "careers"));
    const unsubscribeJobPostings = onSnapshot(jobPostingQ, (snapshot) => {
      setJobPostingCount(snapshot.size);
    });

    // Query Applicant Inquiries count (assuming 'inquiries' with type job)
    const inquiriesQ = query(collection(db, "inquiries"), where("type", "==", "job"));
    const unsubscribeInquiries = onSnapshot(inquiriesQ, (snapshot) => {
      setApplicationCount(snapshot.size);
    });

    return () => {
      unsubscribeJobPostings();
      unsubscribeInquiries();
    };
  }, [userId]);

  const calendars = React.useMemo(() => {
    const baseCalendars = [
      {
        name: "Time & Attendance",
        items: [
          {
            title: "Dashboard",
            href: `/dashboard${userId ? `?id=${encodeURIComponent(userId)}` : ""}`,
            icon: LayoutDashboard,
          },
          {
            title: "Location",
            href: `/time-attendance/location${userId ? `?id=${encodeURIComponent(userId)}` : ""}`,
            icon: MapPin,
          },
          {
            title: "Activity Logs",
            href: `/time-attendance/activity${userId ? `?id=${encodeURIComponent(userId)}` : ""}`,
            icon: FileText,
          },
          {
            title: "Timesheet",
            href: `/time-attendance/timesheet${userId ? `?id=${encodeURIComponent(userId)}` : ""}`,
            icon: Clock,
          },
        ],
      },
    ]

    // 👉 HR Associate lang ang makakakita ng Recruitment
    if (allowedPositions.includes(userDetails.Position)) {
      const totalCount = jobPostingCount + applicationCount;
      baseCalendars.push({
        name: `Recruitment (${totalCount})`,
        items: [
          {
            title: `Job Posting (${jobPostingCount})`,
            href: `/recruitment/job-posting${userId ? `?id=${encodeURIComponent(userId)}` : ""}`,
            icon: Briefcase,
          },
          {
            title: `Applicant Inquiries (${applicationCount})`,
            href: `/recruitment/applicant-inquiries${userId ? `?id=${encodeURIComponent(userId)}` : ""}`,
            icon: Users,
          },
        ],
      });
    }

    return baseCalendars
  }, [userId, userDetails.Position, jobPostingCount, applicationCount]);


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

            </SidebarMenuButton>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarFooter>

      <SidebarRail />
    </Sidebar>
  );
}
