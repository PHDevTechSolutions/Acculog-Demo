"use client";

import React, { useEffect, useState } from "react";
import L from "leaflet";

interface UserInfo {
  Firstname: string;
  Lastname: string;
  profilePicture?: string;
}

interface ActivityLog {
  ReferenceID: string;
  Type: string;
  Status: string;
  Location: string;
  date_created: string;
  Latitude?: number;
  Longitude?: number;
  Remarks: string;
  _id?: string;
}

interface LocationMapProps {
  postsWithLocation: ActivityLog[];
  usersMap: Record<string, UserInfo>;
}

export default function LocationMap({
  postsWithLocation,
  usersMap,
}: LocationMapProps) {
  const [MapContainer, setMapContainer] = useState<any>(null);
  const [TileLayer, setTileLayer] = useState<any>(null);
  const [Marker, setMarker] = useState<any>(null);
  const [Popup, setPopup] = useState<any>(null);

  useEffect(() => {
    // Dynamically import react-leaflet and leaflet css on client-side only
    Promise.all([
      import("react-leaflet").then((mod) => {
        setMapContainer(() => mod.MapContainer);
        setTileLayer(() => mod.TileLayer);
        setMarker(() => mod.Marker);
        setPopup(() => mod.Popup);
      }),
    ]);

    // Fix leaflet's default icon paths (needed when dynamically importing)
    delete (L.Icon.Default.prototype as any)._getIconUrl;
    L.Icon.Default.mergeOptions({
      iconRetinaUrl:
        "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon-2x.png",
      iconUrl:
        "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon.png",
      shadowUrl:
        "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-shadow.png",
    });
  }, []);

  if (!MapContainer || !TileLayer || !Marker || !Popup) {
    return <div>Loading map...</div>;
  }

  const defaultCenter: [number, number] =
    postsWithLocation.length > 0
      ? [postsWithLocation[0].Latitude!, postsWithLocation[0].Longitude!]
      : [14.5995, 120.9842]; // Manila fallback

  return (
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
  );
}
