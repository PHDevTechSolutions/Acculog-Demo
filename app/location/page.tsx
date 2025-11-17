"use client";

import { useEffect, useState, useMemo } from "react";
import { useSearchParams } from "next/navigation";
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
import {
  SidebarInset,
  SidebarProvider,
  SidebarTrigger,
} from "@/components/ui/sidebar";

import { MapContainer, TileLayer, Marker, Popup } from "react-leaflet";
import "leaflet/dist/leaflet.css";
import L from "leaflet";

import type { DateRange } from "react-day-picker";

// Fix leaflet icon issue for markers
delete (L.Icon.Default.prototype as any)._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl:
    "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon-2x.png",
  iconUrl:
    "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon.png",
  shadowUrl:
    "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-shadow.png",
});

interface ActivityLog {
  ReferenceID: string;
  Email: string;
  Type: string;
  Status: string;
  Location: string;
  date_created: string;
  Latitude?: number;
  Longitude?: number;
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

function toLocalDateKey(date: Date | string) {
  const d = typeof date === "string" ? new Date(date) : date;
  const year = d.getFullYear();
  const month = d.getMonth() + 1;
  const day = d.getDate();
  return `${year}-${month.toString().padStart(2, "0")}-${day
    .toString()
    .padStart(2, "0")}`;
}

export default function Page() {
  const searchParams = useSearchParams();
  const { userId, setUserId } = useUser();

  const queryUserId = searchParams?.get("id") ?? "";

  // State for user details including role, department, ReferenceID
  const [userDetails, setUserDetails] = useState<UserDetails | null>(null);
  const [error, setError] = useState<string | null>(null);

  // Date range filter state with localStorage persistence
  const [dateCreatedFilterRange, setDateCreatedFilterRange] = useState<
    DateRange | undefined
  >(undefined);

  // Only render map after hydration to avoid window errors
  const [hydrated, setHydrated] = useState(false);
  useEffect(() => {
    setHydrated(true);
  }, []);

  // Load date range filter from localStorage once on client
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
      // ignore JSON parse errors
    }
  }, []);

  // Save date range filter to localStorage on change
  useEffect(() => {
    if (dateCreatedFilterRange) {
      localStorage.setItem(
        "dateCreatedFilterRange",
        JSON.stringify(dateCreatedFilterRange)
      );
    } else {
      localStorage.removeItem("dateCreatedFilterRange");
    }
  }, [dateCreatedFilterRange]);

  // Sync userId from query param to context
  useEffect(() => {
    if (queryUserId && queryUserId !== userId) {
      setUserId(queryUserId);
    }
  }, [queryUserId, userId, setUserId]);

  // Fetch user details by queryUserId
  useEffect(() => {
    const fetchUserData = async () => {
      if (!queryUserId) {
        setError("User ID is missing.");
        return;
      }
      setError(null);
      try {
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
      } catch (err) {
        console.error("Error fetching user data:", err);
        setError("Failed to load user data.");
      }
    };
    fetchUserData();
  }, [queryUserId]);

  // Activity logs and users map state
  const [posts, setPosts] = useState<ActivityLog[]>([]);
  const [loading, setLoading] = useState(false);
  const [usersMap, setUsersMap] = useState<Record<string, UserInfo>>({});

  // Fetch activity logs
  useEffect(() => {
    async function fetchActivityLogs() {
      setLoading(true);
      try {
        const res = await fetch("/api/ModuleSales/Activity/FetchLog");
        if (!res.ok) throw new Error("Failed to fetch logs");
        const data = await res.json();
        setPosts(data.data);
      } catch (error) {
        console.error(error);
      } finally {
        setLoading(false);
      }
    }
    fetchActivityLogs();
  }, []);

  // Fetch user info for posts
  useEffect(() => {
    async function fetchUsersForPosts() {
      if (posts.length === 0) return;

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
      } catch (error) {
        console.error("Error fetching users:", error);
      }
    }
    fetchUsersForPosts();
  }, [posts]);

  // Filter posts according to role, referenceID, date range, and ensure valid lat/lng
  const postsWithLocation = useMemo(() => {
    if (!userDetails) return [];

    const filteredByDateAndLocation = posts.filter((p) => {
      if (
        typeof p.Latitude !== "number" ||
        typeof p.Longitude !== "number" ||
        isNaN(p.Latitude) ||
        isNaN(p.Longitude)
      )
        return false;

      if (!dateCreatedFilterRange?.from) return true;

      const postDateKey = toLocalDateKey(p.date_created);
      const fromKey = toLocalDateKey(dateCreatedFilterRange.from);
      const toKey = toLocalDateKey(
        dateCreatedFilterRange.to ?? dateCreatedFilterRange.from
      );

      return postDateKey >= fromKey && postDateKey <= toKey;
    });

    if (
      userDetails.Role === "Super Admin" ||
      userDetails.Department === "Human Resources"
    ) {
      return filteredByDateAndLocation;
    }

    return filteredByDateAndLocation.filter(
      (p) => p.ReferenceID === userDetails.ReferenceID
    );
  }, [posts, dateCreatedFilterRange, userDetails]);

  // Default center for the map (Manila fallback)
  const defaultCenter: [number, number] =
    postsWithLocation.length > 0
      ? [postsWithLocation[0].Latitude!, postsWithLocation[0].Longitude!]
      : [14.5995, 120.9842];

  if (error) return <p className="p-4 text-red-600">{error}</p>;
  if (!userDetails) return <p className="p-4">Loading user details...</p>;

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
              <Separator
                orientation="vertical"
                className="mr-2 data-[orientation=vertical]:h-4"
              />
              <Breadcrumb>
                <BreadcrumbList>
                  <BreadcrumbItem>
                    <BreadcrumbPage>Location Map</BreadcrumbPage>
                  </BreadcrumbItem>
                </BreadcrumbList>
              </Breadcrumb>
            </header>

            <main className="flex-1 p-4 h-[calc(100vh-64px)]">
              {loading && <p>Loading activity logs...</p>}

              {!loading && postsWithLocation.length === 0 && (
                <p>No data available for your account in this date range.</p>
              )}

              {hydrated && postsWithLocation.length > 0 && (
                <MapContainer
                  center={defaultCenter}
                  zoom={13}
                  scrollWheelZoom={true}
                  style={{ height: "100%", width: "100%" }}
                >
                  <TileLayer
                    attribution='&copy; <a href="https://osm.org/copyright">OpenStreetMap</a>'
                    url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
                  />
                  {postsWithLocation.map((post) => (
                    <Marker
                      key={post._id ?? post.date_created}
                      position={[post.Latitude!, post.Longitude!]}
                    >
                      <Popup>
                        <strong>
                          {usersMap[post.ReferenceID]
                            ? `${usersMap[post.ReferenceID].Firstname} ${usersMap[post.ReferenceID].Lastname}`
                            : "Unknown User"}
                        </strong>
                        <br />
                        Type: {post.Type}
                        <br />
                        Status: {post.Status}
                        <br />
                        Location: {post.Location}
                        <br />
                        Date: {new Date(post.date_created).toLocaleString()}
                        {post.Remarks && (
                          <>
                            <br />
                            Remarks: {post.Remarks}
                          </>
                        )}
                      </Popup>
                    </Marker>
                  ))}
                </MapContainer>
              )}

              <style jsx global>{`
                .leaflet-pane {
                  z-index: 0 !important;
                }
              `}</style>
            </main>
          </SidebarInset>
        </SidebarProvider>
      </FormatProvider>
    </UserProvider>
  );
}
