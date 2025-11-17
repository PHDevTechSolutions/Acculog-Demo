"use client";

import React from "react";
import { MapContainer, TileLayer, Marker, Popup } from "react-leaflet";
import L from "leaflet";

interface Post {
  _id?: string;
  Latitude: number;
  Longitude: number;
  ReferenceID: string;
  Type: string;
  Status: string;
  Location: string;
  date_created: string;
  Remarks?: string;
}

interface UserInfo {
  Firstname: string;
  Lastname: string;
  profilePicture?: string;
}

interface Props {
  posts: Post[];
  usersMap: Record<string, UserInfo>;
  defaultCenter: [number, number];
}

// Fix leaflet icon URLs
delete (L.Icon.Default.prototype as any)._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl:
    "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon-2x.png",
  iconUrl:
    "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon.png",
  shadowUrl:
    "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-shadow.png",
});

export default function LocationMap({ posts, usersMap, defaultCenter }: Props) {
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
      {posts.map((post) => (
        <Marker key={post._id ?? post.date_created} position={[post.Latitude, post.Longitude]}>
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
