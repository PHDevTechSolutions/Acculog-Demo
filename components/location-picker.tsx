"use client";

import React, { useEffect, useState } from "react";
import { MapContainer, TileLayer, Marker, useMapEvents } from "react-leaflet";
import L from "leaflet";

interface LocationPickerProps {
  initialLat: number;
  initialLng: number;
  onLocationChangeAction: (lat: number, lng: number, address: string) => void;
}

const reverseGeocode = async (lat: number, lng: number) => {
  try {
    const res = await fetch(
      `https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lng}`
    );
    const data = await res.json();
    return data.display_name || "Unknown location";
  } catch {
    return "Unknown location";
  }
};

const DraggableMarker = ({
  position,
  onPositionChanged,
}: {
  position: L.LatLngExpression;
  onPositionChanged: (lat: number, lng: number) => void;
}) => {
  const [markerPosition, setMarkerPosition] = useState(position);

  const eventHandlers = {
    dragend(e: L.DragEndEvent) {
      const latlng = e.target.getLatLng();
      setMarkerPosition(latlng);
      onPositionChanged(latlng.lat, latlng.lng);
    },
  };

  return (
    <Marker
      position={markerPosition}
      draggable={true}
      eventHandlers={eventHandlers}
    />
  );
};

export default function LocationPicker({
  initialLat,
  initialLng,
  onLocationChangeAction,
}: LocationPickerProps) {
  const [position, setPosition] = useState<L.LatLngExpression>([
    initialLat,
    initialLng,
  ]);
  const [address, setAddress] = useState("Loading address...");

  const handlePositionChange = async (lat: number, lng: number) => {
    setPosition([lat, lng]);
    const newAddress = await reverseGeocode(lat, lng);
    setAddress(newAddress);
    onLocationChangeAction(lat, lng, newAddress);
  };

  useEffect(() => {
    handlePositionChange(initialLat, initialLng);
  }, [initialLat, initialLng]);

  return (
    <div>
      <MapContainer center={position} zoom={15} style={{ height: "300px", width: "100%" }}>
        <TileLayer
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
          attribution="&copy; OpenStreetMap contributors"
        />
        <DraggableMarker position={position} onPositionChanged={handlePositionChange} />
      </MapContainer>
      <p className="mt-2 text-center text-sm">{address}</p>
    </div>
  );
}
