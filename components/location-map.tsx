"use client";

import { MapContainer, TileLayer, Marker, Popup } from "react-leaflet";
import "leaflet/dist/leaflet.css";
import L from "leaflet";
import React from "react";

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

// Fix leaflet icon issue
delete (L.Icon.Default.prototype as any)._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl:
    "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon-2x.png",
  iconUrl:
    "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon.png",
  shadowUrl:
    "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-shadow.png",
});

interface LocationMapProps {
  postsWithLocation: ActivityLog[];
  usersMap: Record<string, UserInfo>;
}

export default function LocationMap({
  postsWithLocation,
  usersMap,
}: LocationMapProps) {
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
