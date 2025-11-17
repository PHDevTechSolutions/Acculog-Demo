"use client";

import React, { useEffect, useState, useMemo } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { UserProvider, useUser } from "@/contexts/UserContext";
import { FormatProvider } from "@/contexts/FormatContext";

import { AppSidebar } from "@/components/app-sidebar";
import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbList,
  BreadcrumbPage,
} from "@/components/ui/breadcrumb";
import { Separator } from "@/components/ui/separator";
import { SidebarInset, SidebarProvider, SidebarTrigger } from "@/components/ui/sidebar";
import { Button } from "@/components/ui/button";
import ActivityDialog from "@/components/dashboard-dialog";
import CreateAttendance from "@/components/CreateAttendance";
import { type DateRange } from "react-day-picker";

// ---------------- Interfaces ----------------
interface ActivityLog {
  ReferenceID: string;
  Email: string;
  Type: string;
  Status: string;
  Location: string;
  date_created: string;
  PhotoURL?: string;
  Remarks: string;
  _id?: string;
}

interface UserInfo {
  Firstname: string;
  Lastname: string;
  profilePicture?: string;
}

interface UserDetails {
  UserId: string;
  Firstname: string;
  Lastname: string;
  Email: string;
  Role: string;
  Department: string;
  Company?: string;
  ReferenceID: string;
  profilePicture?: string;
}

interface FormData {
  ReferenceID: string;
  Email: string;
  Type: string;
  Status: string;
  PhotoURL: string;
  Remarks: string;
  _id?: string;
}

// ---------------- Helpers ----------------
function toLocalDateKey(date: Date | string) {
  const d = typeof date === "string" ? new Date(date) : date;
  const year = d.getFullYear();
  const month = d.getMonth() + 1;
  const day = d.getDate();
  return `${year}-${month.toString().padStart(2, "0")}-${day.toString().padStart(2, "0")}`;
}

function generateCalendarDays(year: number, month: number): Date[] {
  const days: Date[] = [];
  const firstDayOfMonth = new Date(year, month, 1);
  const lastDayOfMonth = new Date(year, month + 1, 0);
  const firstWeekday = firstDayOfMonth.getDay();

  for (let i = firstWeekday - 1; i >= 0; i--) {
    days.push(new Date(year, month, 1 - i - 1));
  }
  for (let day = 1; day <= lastDayOfMonth.getDate(); day++) {
    days.push(new Date(year, month, day));
  }
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

// ---------------- Page Component ----------------
export default function Page() {
  const searchParams = useSearchParams();
  const { userId, setUserId } = useUser();
  const router = useRouter();

  const [dateCreatedFilterRange, setDateCreatedFilterRange] = useState<DateRange | undefined>(undefined);

  useEffect(() => {
    try {
      const stored = localStorage.getItem("dateCreatedFilterRange");
      if (stored) {
        const parsed = JSON.parse(stored);
        if (parsed?.from) parsed.from = new Date(parsed.from);
        if (parsed?.to) parsed.to = new Date(parsed.to);
        setDateCreatedFilterRange(parsed);
      }
    } catch {
      // ignore
    }
  }, []);

  useEffect(() => {
    if (dateCreatedFilterRange) {
      localStorage.setItem("dateCreatedFilterRange", JSON.stringify(dateCreatedFilterRange));
    } else {
      localStorage.removeItem("dateCreatedFilterRange");
    }
  }, [dateCreatedFilterRange]);

  const queryUserId = searchParams?.get("id") ?? "";
  useEffect(() => {
    if (queryUserId && queryUserId !== userId) {
      setUserId(queryUserId);
    }
  }, [queryUserId, userId, setUserId]);

  const [userDetails, setUserDetails] = useState<UserDetails | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [posts, setPosts] = useState<ActivityLog[]>([]);
  const [loading, setLoading] = useState(false);
  const [usersMap, setUsersMap] = useState<Record<string, UserInfo>>({});

  const [currentMonth, setCurrentMonth] = useState<Date>(() => {
    if (dateCreatedFilterRange?.from) return new Date(dateCreatedFilterRange.from);
    return new Date();
  });

  const [selectedEvent, setSelectedEvent] = useState<ActivityLog | null>(null);
  const [dialogOpen, setDialogOpen] = useState(false);

  const [searchText, setSearchText] = useState("");
  const [createAttendanceOpen, setCreateAttendanceOpen] = useState(false);
  const [formData, setFormData] = useState<FormData>({
    ReferenceID: "",
    Email: "",
    Type: "",
    Status: "",
    PhotoURL: "",
    Remarks: "",
  });

  const onChangeAction = (field: keyof FormData, value: any) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
  };

  // ---------------- Fetch Functions ----------------
  const fetchAccountAction = async () => {
    try {
      const res = await fetch("/api/ModuleSales/Activity/FetchLog");
      if (!res.ok) throw new Error("Failed to fetch logs");
      const data = await res.json();
      setPosts(data.data);
    } catch (err) {
      console.error("Error fetching logs:", err);
    }
  };

  // Fetch posts on mount
  useEffect(() => {
    setLoading(true);
    fetchAccountAction().finally(() => setLoading(false));
  }, []);

  // Fetch user details
  useEffect(() => {
    if (!queryUserId) {
      setError("User ID is missing.");
      setLoading(false);
      return;
    }
    (async () => {
      try {
        setLoading(true);
        const res = await fetch(`/api/user?id=${encodeURIComponent(queryUserId)}`);
        if (!res.ok) throw new Error("Failed to fetch user data");
        const data = await res.json();
        setUserDetails({
          UserId: data._id ?? "",
          Firstname: data.Firstname ?? "",
          Lastname: data.Lastname ?? "",
          Email: data.Email ?? "",
          Role: data.Role ?? "",
          Department: data.Department ?? "",
          Company: data.Company ?? "",
          ReferenceID: data.ReferenceID ?? "",
          profilePicture: data.profilePicture ?? "",
        });
        setError(null);
      } catch (err) {
        console.error("Error fetching user data:", err);
        setError("Failed to load user data.");
      } finally {
        setLoading(false);
      }
    })();
  }, [queryUserId]);

  // Autofill formData from userDetails
  useEffect(() => {
    if (userDetails) {
      setFormData((prev) => ({
        ...prev,
        ReferenceID: userDetails.ReferenceID,
        Email: userDetails.Email,
      }));
    }
  }, [userDetails]);

  // Fetch users for mapping names
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
          };
        });
        setUsersMap(map);
      } catch (err) {
        console.error("Error fetching users:", err);
      }
    })();
  }, [posts]);

  // ---------------- Filtering ----------------
  const filteredPosts = useMemo(() => {
    let visiblePosts = posts;

    if (dateCreatedFilterRange?.from) {
      const fromDate = new Date(dateCreatedFilterRange.from);
      fromDate.setHours(0, 0, 0, 0);

      const toDate = new Date(dateCreatedFilterRange.to ?? dateCreatedFilterRange.from);
      toDate.setHours(23, 59, 59, 999);

      visiblePosts = visiblePosts.filter((post) => {
        const postDate = new Date(post.date_created);
        return postDate >= fromDate && postDate <= toDate;
      });
    }

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
  }, [posts, dateCreatedFilterRange, searchText, usersMap]);

  const filteredByReference = useMemo(() => {
    if (!userDetails?.ReferenceID) return [];
    return filteredPosts.filter((post) => post.ReferenceID === userDetails.ReferenceID);
  }, [filteredPosts, userDetails]);

  const allVisibleAccounts = useMemo(() => {
    if (!userDetails) return [];
    return userDetails.Role === "Super Admin" || userDetails.Department === "Human Resources"
      ? filteredPosts
      : filteredByReference;
  }, [userDetails, filteredPosts, filteredByReference]);

  const groupedByDate = useMemo(() => {
    const groups: Record<string, ActivityLog[]> = {};
    allVisibleAccounts.forEach((post) => {
      const dateKey = toLocalDateKey(post.date_created);
      if (!groups[dateKey]) groups[dateKey] = [];
      groups[dateKey].push(post);
    });
    return groups;
  }, [allVisibleAccounts]);

  const calendarDays = useMemo(() => generateCalendarDays(currentMonth.getFullYear(), currentMonth.getMonth()), [currentMonth]);

  const today = new Date();
  const goToPrevMonth = () => setCurrentMonth(new Date(currentMonth.getFullYear(), currentMonth.getMonth() - 1, 1));
  const goToNextMonth = () => setCurrentMonth(new Date(currentMonth.getFullYear(), currentMonth.getMonth() + 1, 1));

  const onEventClick = (event: ActivityLog) => {
    setSelectedEvent(event);
    setDialogOpen(true);
  };

  // ---------------- Render ----------------
  return (
    <UserProvider>
      <FormatProvider>
        <SidebarProvider>
          <AppSidebar
            userId={userId ?? undefined}
            dateCreatedFilterRange={dateCreatedFilterRange}
            setDateCreatedFilterRangeAction={setDateCreatedFilterRange}
          />
          <SidebarInset>
            <header className="bg-background sticky top-0 flex h-16 shrink-0 items-center gap-2 border-b px-4">
              <SidebarTrigger className="-ml-1" />
              <Separator orientation="vertical" className="mr-2 data-[orientation=vertical]:h-4" />
              <Breadcrumb>
                <BreadcrumbList>
                  <BreadcrumbItem>
                    <BreadcrumbPage>
                      Activity Calendar —{" "}
                      {currentMonth.toLocaleDateString(undefined, { year: "numeric", month: "long" })}
                    </BreadcrumbPage>
                  </BreadcrumbItem>
                </BreadcrumbList>
              </Breadcrumb>
              <div className="ml-auto flex gap-2">
                <button onClick={goToPrevMonth} className="rounded text-xs border px-3 py-1 hover:bg-gray-100">
                  Prev
                </button>
                <button onClick={goToNextMonth} className="rounded text-xs border px-3 py-1 hover:bg-gray-100">
                  Next
                </button>
              </div>
            </header>

            <main className="p-4 overflow-auto max-h-[calc(100vh-64px)]">
              {/* Search bar */}
              <div className="mb-4 flex items-center gap-3">
                <input
                  type="text"
                  placeholder="Search by first name, last name or email..."
                  value={searchText}
                  onChange={(e) => setSearchText(e.target.value)}
                  className="flex-grow rounded border px-3 py-2 text-sm"
                  aria-label="Search events"
                />
                <Button onClick={() => setCreateAttendanceOpen(true)}>Create Attendance</Button>
              </div>

              {loading && <p>Loading...</p>}
              {error && <p className="text-red-600 mb-4">Error: {error}</p>}

              {!loading && !error && (
                <div className="grid grid-cols-1 sm:grid-cols-7 gap-1 text-center select-none">
                  {/* Weekday headers */}
                  {["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"].map((day) => (
                    <div key={day} className="font-semibold border-b py-1">{day}</div>
                  ))}

                  {/* Days grid */}
                  {calendarDays.map((date, idx) => {
                    const dateKey = toLocalDateKey(date);
                    const logs = groupedByDate[dateKey] || [];
                    const isCurrentMonth = date.getMonth() === currentMonth.getMonth();
                    const isToday = isSameDay(date, today);

                    return (
                      <div
                        key={idx}
                        className={`min-h-[110px] p-2 rounded border flex flex-col ${isCurrentMonth
                          ? "bg-white border-gray-300"
                          : "bg-gray-50 text-gray-400 border-gray-200"
                          } ${isToday ? "border-blue-500 border-2" : ""}`}
                      >
                        <div className="text-sm font-semibold mb-1 text-left">{date.getDate()}</div>
                        <ul className="text-xs text-left overflow-auto flex-1 space-y-1 max-h-[90px]">
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
                                  <strong>{user ? `${user.Firstname} ${user.Lastname}` : "Unknown User"}</strong> - <strong className="bg-blue-100 text-blue-800 rounded px-1">{log.Type}</strong>: {log.Status}
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

              <CreateAttendance
                open={createAttendanceOpen}
                onOpenChangeAction={setCreateAttendanceOpen}
                formData={formData}
                onChangeAction={onChangeAction}
                userDetails={{
                  ReferenceID: userDetails?.ReferenceID ?? "",
                  Email: userDetails?.Email ?? "",
                }}
                fetchAccountAction={fetchAccountAction}
                setFormAction={setFormData}
              />

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
          </SidebarInset>
        </SidebarProvider>
      </FormatProvider>
    </UserProvider>
  );
}
