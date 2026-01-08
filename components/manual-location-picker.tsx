"use client";

import React, { useEffect, useRef, useState } from "react";
import {
  MapContainer,
  TileLayer,
  Marker,
  Circle,
  useMapEvents,
} from "react-leaflet";
import L from "leaflet";
import { toast } from "sonner";
import "leaflet/dist/leaflet.css";

interface ManualLocationPickerProps {
  latitude: number | null;
  longitude: number | null;
  radiusMeters?: number;
  onChange: (lat: number, lng: number, address?: string) => void;
}

/* Fix leaflet marker icons */
delete (L.Icon.Default.prototype as any)._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl:
    "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon-2x.png",
  iconUrl:
    "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon.png",
  shadowUrl:
    "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-shadow.png",
});

/* Distance helper */
function distanceInMeters(
  lat1: number,
  lng1: number,
  lat2: number,
  lng2: number
) {
  return L.latLng(lat1, lng1).distanceTo(L.latLng(lat2, lng2));
}

/* Click handler with radius restriction */
function ClickHandler({
  center,
  radius,
  onPick,
}: {
  center: [number, number];
  radius: number;
  onPick: (lat: number, lng: number) => void;
}) {
  useMapEvents({
    click(e) {
      const d = distanceInMeters(
        center[0],
        center[1],
        e.latlng.lat,
        e.latlng.lng
      );

      if (d <= radius) {
        onPick(e.latlng.lat, e.latlng.lng);
      } else {
        toast.error("Pin must stay inside the allowed radius.");
      }
    },
  });

  return null;
}

export default function ManualLocationPicker({
  latitude,
  longitude,
  radiusMeters = 1500,
  onChange,
}: ManualLocationPickerProps) {
  // 🔒 FIXED center (GPS origin – never changes)
  const fixedCenterRef = useRef<[number, number] | null>(null);

  // 📍 Marker position (movable)
  const [position, setPosition] = useState<[number, number] | null>(null);

  /* Initialize center ONCE from GPS */
  useEffect(() => {
    if (latitude && longitude && !fixedCenterRef.current) {
      fixedCenterRef.current = [latitude, longitude];
      setPosition([latitude, longitude]);
    }
  }, [latitude, longitude]);

  const handlePick = async (lat: number, lng: number) => {
    setPosition([lat, lng]);

    try {
      const res = await fetch(
        `https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lng}`
      );
      const data = await res.json();
      onChange(lat, lng, data?.display_name);
    } catch {
      onChange(lat, lng);
    }
  };

  if (!fixedCenterRef.current || !position) {
    return (
      <div className="text-xs text-gray-500 italic">
        Location not available yet.
      </div>
    );
  }

  const center = fixedCenterRef.current;

  return (
    <div className="w-full h-[260px] rounded-lg overflow-hidden border">
      <MapContainer
        center={center}
        zoom={16}
        style={{ height: "100%", width: "100%" }}
      >
        <TileLayer
          attribution="&copy; OpenStreetMap contributors"
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        />

        {/* 🔴 FIXED radius */}
        <Circle
          center={center}
          radius={radiusMeters}
          pathOptions={{
            color: "blue",
            fillColor: "#3b82f6",
            fillOpacity: 0.15,
          }}
        />

        {/* 🖱 Click restriction */}
        <ClickHandler
          center={center}
          radius={radiusMeters}
          onPick={handlePick}
        />

        {/* 📍 Draggable marker */}
        <Marker
          position={position}
          draggable
          eventHandlers={{
            dragend: (e) => {
              const marker = e.target as L.Marker;
              const p = marker.getLatLng();

              const d = distanceInMeters(
                center[0],
                center[1],
                p.lat,
                p.lng
              );

              if (d <= radiusMeters) {
                handlePick(p.lat, p.lng);
              } else {
                // ⛔ snap back
                marker.setLatLng(position);
                toast.error("Pin must stay inside the allowed radius.");
              }
            },
          }}
        />
      </MapContainer>

      <div className="text-[10px] text-gray-500 px-2 py-1 bg-gray-50 border-t">
        You can only pin within {radiusMeters} meters from your starting
        location.
      </div>
    </div>
  );
}
