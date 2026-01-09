"use client";

import React, { useState, useEffect, useMemo } from "react";
import { Button } from "@/components/ui/button";
import CreateAttendance from "@/components/CreateAttendance";
import CreateSalesAttendance from "@/components/CreateSalesAttenance";
import ActivityDialog from "@/components/dashboard-dialog";
import { toast } from "sonner";

interface ActivityLog {
  ReferenceID: string;
  Email: string;
  Type: string;
  Status: string;
  date_created: string;
  Location: string;
  Remarks: string; 
  _id?: string;
}

interface UserInfo {
  Firstname: string;
  Lastname: string;
  profilePicture?: string;
  TSM?: string;
}

interface UserDetails {
  ReferenceID: string;
  Email: string;
  Role: string;
  Department?: string;
  TSM: string;
}

interface FormData {
  ReferenceID: string;
  Email: string;
  Type: string;
  Status: string;
  PhotoURL: string;
  Remarks: string;
  TSM: string;
  _id?: string;
}

interface DashboardProps {
  userDetails: UserDetails | null;
  loading: boolean;
  error: string | null;
  formData: FormData;
  setFormData: React.Dispatch<React.SetStateAction<FormData>>;
}

// Helper to format date keys like "YYYY-MM-DD"
function toLocalDateKey(date: Date | string) {
  const d = typeof date === "string" ? new Date(date) : date;
  const year = d.getFullYear();
  const month = (d.getMonth() + 1).toString().padStart(2, "0");
  const day = d.getDate().toString().padStart(2, "0");
  return `${year}-${month}-${day}`;
}

// Generate calendar days including padding days to fill weeks (Sunday-Saturday)
function generateCalendarDays(year: number, month: number): Date[] {
  const days: Date[] = [];
  const firstDayOfMonth = new Date(year, month, 1);
  const lastDayOfMonth = new Date(year, month + 1, 0);
  const firstWeekday = firstDayOfMonth.getDay();

  // Days from previous month to fill first week
  for (let i = firstWeekday - 1; i >= 0; i--) {
    days.push(new Date(year, month, 1 - i - 1));
  }

  // Days of current month
  for (let day = 1; day <= lastDayOfMonth.getDate(); day++) {
    days.push(new Date(year, month, day));
  }

  // Days from next month to fill last week
  while (days.length % 7 !== 0) {
    const nextDay = new Date(year, month, lastDayOfMonth.getDate() + (days.length - firstWeekday) + 1);
    days.push(nextDay);
  }

  return days;
}

function isSameDay(d1: Date, d2: Date) {
  return (
    d1.getFullYear() === d2.getFullYear() &&
    d1.getMonth() === d2.getMonth() &&
    d1.getDate() === d2.getDate()
  );
}

export default function Dashboard({
  userDetails,
  loading,
  error,
  formData,
  setFormData,
}: DashboardProps) {
  const [posts, setPosts] = useState<ActivityLog[]>([]);
  const [usersMap, setUsersMap] = useState<Record<string, UserInfo>>({});
  const [selectedEvent, setSelectedEvent] = useState<ActivityLog | null>(null);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [searchText, setSearchText] = useState("");
  const [createAttendanceOpen, setCreateAttendanceOpen] = useState(false);
  const [createSalesAttendanceOpen, setCreateSalesAttendanceOpen] = useState(false);
  const [currentMonth, setCurrentMonth] = useState(new Date());
  const today = new Date();

  // Fetch activity logs
  const fetchAccountAction = async () => {
    try {
      // no setError here because it's controlled by parent
      const res = await fetch("/api/ModuleSales/Activity/FetchLog");
      if (!res.ok) throw new Error("Failed to fetch logs");
      const data = await res.json();
      setPosts(data.data);
    } catch (err) {
      console.error("Error fetching logs:", err);
      toast.error("Failed to fetch activity logs.");
    }
  };

  // Fetch users map when posts update
  useEffect(() => {
    if (posts.length === 0) return;

    (async () => {
      const uniqueRefs = Array.from(new Set(posts.map((p) => p.ReferenceID)));
      try {
        const res = await fetch(`/api/users?referenceIDs=${uniqueRefs.join(",")}`);
        if (!res.ok) throw new Error("Failed to fetch users");
        const usersData = await res.json();

        const map: Record<string, UserInfo> = {};
        usersData.forEach((user: any) => {
          map[user.ReferenceID] = {
            Firstname: user.Firstname,
            Lastname: user.Lastname,
            profilePicture: user.profilePicture,
            TSM: user.TSM,
          };
        });
        setUsersMap(map);
      } catch (err) {
        console.error("Error fetching users:", err);
      }
    })();
  }, [posts]);

  // Initial fetch + polling every 5s
  useEffect(() => {
    fetchAccountAction();
    const interval = setInterval(fetchAccountAction, 5000);
    return () => clearInterval(interval);
  }, []);

  // Filter posts by search text
  const filteredPosts = useMemo(() => {
    let visiblePosts = [...posts];

    if (searchText.trim()) {
      const lowerSearch = searchText.trim().toLowerCase();
      visiblePosts = visiblePosts.filter((post) => {
        const user = usersMap[post.ReferenceID];
        const first = user?.Firstname.toLowerCase() ?? "";
        const last = user?.Lastname.toLowerCase() ?? "";
        const email = post.Email.toLowerCase();
        return first.includes(lowerSearch) || last.includes(lowerSearch) || email.includes(lowerSearch);
      });
    }

    visiblePosts.sort(
      (a, b) => new Date(b.date_created).getTime() - new Date(a.date_created).getTime()
    );

    return visiblePosts;
  }, [posts, searchText, usersMap]);

  // Determine visible posts based on user role
  const allVisibleAccounts = useMemo(() => {
    if (!userDetails) return [];
    if (userDetails.Role === "Super Admin" || userDetails.Department === "Human Resources") return filteredPosts;
    return filteredPosts.filter((post) => post.ReferenceID === userDetails.ReferenceID);
  }, [userDetails, filteredPosts]);

  // Group posts by date key
  const groupedByDate = useMemo(() => {
    const groups: Record<string, ActivityLog[]> = {};
    allVisibleAccounts.forEach((post) => {
      const dateKey = toLocalDateKey(post.date_created);
      if (!groups[dateKey]) groups[dateKey] = [];
      groups[dateKey].push(post);
    });
    return groups;
  }, [allVisibleAccounts]);

  // Calendar days for current month
  const calendarDays = useMemo(() => generateCalendarDays(currentMonth.getFullYear(), currentMonth.getMonth()), [currentMonth]);

  // Role checks
  const isTSMorTSA = userDetails?.Role === "Territory Sales Manager" || userDetails?.Role === "Territory Sales Associate";
  const isNotTSMorTSA = userDetails && !isTSMorTSA;

  // Handle form data changes
  const onChangeAction = (field: keyof FormData, value: any) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
  };

  // Handle clicking on event
  const onEventClick = (event: ActivityLog) => {
    setSelectedEvent(event);
    setDialogOpen(true);
  };

  return (
    <main className="flex flex-1 flex-col gap-4 p-4 overflow-auto">
      <div className="mb-4 flex items-center gap-3">
        <input
          type="text"
          placeholder="Search by first name, last name or email..."
          value={searchText}
          onChange={(e) => setSearchText(e.target.value)}
          className="flex-grow rounded border px-3 py-2 text-sm"
          aria-label="Search events"
        />

        {isNotTSMorTSA && (
          <Button onClick={() => setCreateAttendanceOpen(true)}>Create Attendance</Button>
        )}

        {isTSMorTSA && (
          <Button onClick={() => setCreateSalesAttendanceOpen(true)}>Create TSA Attendance</Button>
        )}
      </div>

      {loading && <p>Loading...</p>}
      {error && <p className="text-red-600 mb-4">{error}</p>}

      {!loading && !error && (
        <div className="grid grid-cols-1 sm:grid-cols-7 gap-1 text-center select-none">
          {calendarDays.map((date, idx) => {
            const dateKey = toLocalDateKey(date);
            const logs = groupedByDate[dateKey] || [];
            const isCurrentMonth = date.getMonth() === currentMonth.getMonth();
            const isToday = isSameDay(date, today);
            const dayName = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"][date.getDay()];

            return (
              <div
                key={idx}
                className={`min-h-[110px] p-2 rounded border flex flex-col text-left
                  ${isCurrentMonth ? "bg-white border-gray-300" : "bg-gray-50 text-gray-400 border-gray-200"}
                  ${isToday ? "border-blue-500 border-2" : ""}
                `}
              >
                <div className="text-sm font-semibold mb-1">
                  {date.getDate()} - {dayName}
                </div>

                <ul className="text-xs overflow-auto flex-1 space-y-1 max-h-[90px]">
                  {logs.length === 0 && <li className="text-gray-400 italic">No events</li>}
                  {logs.map((log) => {
                    const user = usersMap[log.ReferenceID];
                    return (
                      <li
                        key={log._id ?? log.date_created}
                        className="truncate flex items-center space-x-2 cursor-pointer hover:bg-blue-200"
                        title={`${log.Type} - ${log.Status} @ ${new Date(log.date_created).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}`}
                        onClick={() => onEventClick(log)}
                      >
                        {user?.profilePicture ? (
                          <img
                            src={user.profilePicture}
                            alt={`${user.Firstname} ${user.Lastname}`}
                            className="w-5 h-5 rounded-full object-cover"
                          />
                        ) : (
                          <div className="w-5 h-5 rounded-full bg-gray-300 flex items-center justify-center text-xs text-gray-600">?</div>
                        )}
                        <span className="flex-1 text-[10px]">
                          <strong>{user ? `${user.Firstname} ${user.Lastname}` : "Unknown User"}</strong> -{" "}
                          <strong className="bg-blue-100 text-blue-800 rounded px-1">{log.Type}</strong>: {log.Status}
                        </span>
                      </li>
                    );
                  })}
                </ul>
              </div>
            );
          })}
        </div>
      )}

      {isNotTSMorTSA && (
        <CreateAttendance
          open={createAttendanceOpen}
          onOpenChangeAction={setCreateAttendanceOpen}
          formData={formData}
          onChangeAction={onChangeAction}
          userDetails={{
            ReferenceID: userDetails?.ReferenceID ?? "",
            Email: userDetails?.Email ?? "",
            TSM: userDetails?.TSM ?? "",
          }}
          fetchAccountAction={fetchAccountAction}
          setFormAction={setFormData}
        />
      )}

      {isTSMorTSA && (
        <CreateSalesAttendance
          open={createSalesAttendanceOpen}
          onOpenChangeAction={setCreateSalesAttendanceOpen}
          formData={formData}
          onChangeAction={onChangeAction}
          userDetails={{
            ReferenceID: userDetails?.ReferenceID ?? "",
            Email: userDetails?.Email ?? "",
            TSM: userDetails?.TSM ?? "",
          }}
          fetchAccountAction={fetchAccountAction}
          setFormAction={setFormData}
        />
      )}

      <ActivityDialog
        open={dialogOpen}
        onOpenChange={(open) => {
          setDialogOpen(open);
          if (!open) setSelectedEvent(null);
        }}
        selectedEvent={selectedEvent}
        usersMap={usersMap}
      />
    </main>
  );
}
