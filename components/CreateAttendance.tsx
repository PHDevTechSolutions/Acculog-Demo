"use client";

import React, { useEffect, useState } from "react";
import { toast } from "sonner";
import Camera from "./camera";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectTrigger,
  SelectContent,
  SelectItem,
  SelectValue,
} from "@/components/ui/select";
import { Button } from "@/components/ui/button";

interface FormData {
  ReferenceID: string;
  Email: string;
  Type: string;
  Status: string;
  PhotoURL: string;
  Remarks: string;
  _id?: string;
}

interface UserDetails {
  ReferenceID: string;
  Email: string;
}

interface CreateAttendanceProps {
  open: boolean;
  onOpenChangeAction: (open: boolean) => void;
  formData: FormData;
  onChangeAction: (field: Exclude<keyof FormData, "_id">, value: any) => void;
  userDetails: UserDetails;
  fetchAccountAction: () => void;
  setFormAction: React.Dispatch<React.SetStateAction<FormData>>;
}

export default function CreateAttendance({
  open,
  onOpenChangeAction,
  formData,
  onChangeAction,
  userDetails,
  fetchAccountAction,
  setFormAction,
}: CreateAttendanceProps) {
  const [locationAddress, setLocationAddress] = useState("Fetching location...");
  const [latitude, setLatitude] = useState<number | null>(null);
  const [longitude, setLongitude] = useState<number | null>(null);
  const [capturedImage, setCapturedImage] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  // Auto-set Type to "On Field" on mount or open
  useEffect(() => {
    if (open && formData.Type !== "On Field") {
      onChangeAction("Type", "On Field");
    }
  }, [open, formData.Type, onChangeAction]);

  // Auto-fetch location when open
  useEffect(() => {
    if (!open) return;

    navigator.geolocation.getCurrentPosition(
      ({ coords }) => {
        setLatitude(coords.latitude);
        setLongitude(coords.longitude);

        fetch(
          `https://nominatim.openstreetmap.org/reverse?format=json&lat=${coords.latitude}&lon=${coords.longitude}`
        )
          .then((res) => res.json())
          .then((data) => setLocationAddress(data.display_name || "Location detected"))
          .catch(() => setLocationAddress("Location detected (no address)"));
      },
      (error) => {
        console.error("Geolocation error:", error);
        setLocationAddress("Location unavailable");
      },
      { enableHighAccuracy: true, timeout: 10000, maximumAge: 0 }
    );

    return () => setCapturedImage(null);
  }, [open]);

  const uploadToCloudinary = async (base64: string): Promise<string> => {
    const imgData = new FormData();
    imgData.append("file", base64);
    imgData.append("upload_preset", "Xchire");

    const res = await fetch("https://api.cloudinary.com/v1_1/dhczsyzcz/image/upload", {
      method: "POST",
      body: imgData,
    });

    const data = await res.json();
    return data.secure_url;
  };

  const handleCreate = async () => {
    if (!capturedImage) return toast.error("Please capture a photo first.");
    if (!locationAddress || locationAddress === "Fetching location...")
      return toast.error("Location not ready yet.");

    setLoading(true);
    try {
      const photoURL = await uploadToCloudinary(capturedImage);

      const payload = {
        ...formData,
        PhotoURL: photoURL,
        Location: locationAddress,
        Latitude: latitude,
        Longitude: longitude,
      };

      const response = await fetch("/api/ModuleSales/Activity/AddLog", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      const data = await response.json();
      if (!response.ok) throw new Error(data.message || "Failed to create attendance");

      toast.success("Attendance created!");
      fetchAccountAction();
      onOpenChangeAction(false);

      setFormAction({
        ReferenceID: userDetails.ReferenceID,
        Email: userDetails.Email,
        Type: "On Field",
        Status: "",
        PhotoURL: "",
        Remarks: "",
      });

      setCapturedImage(null);
    } catch (err) {
      console.error(err);
      toast.error("Error saving attendance.");
    }
    setLoading(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChangeAction}>
      <DialogContent className="rounded-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Create Attendance</DialogTitle>
        </DialogHeader>

        <div className="flex flex-col md:flex-row gap-6 mt-4">
          {/* LEFT SIDE: CAMERA + captured image + extra fields (below camera) */}
          <div className="flex-1 flex flex-col items-center">
            <Camera onCaptureAction={(img) => setCapturedImage(img)} />
            {capturedImage && (
              <>
                <img
                  src={capturedImage}
                  alt="preview"
                  className="rounded-lg mt-4 border max-w-xl w-full"
                />

                {/* Show these fields below the camera */}
                <div className="w-full mt-4 space-y-4">
                  <div className="grid gap-2">
                    <Label>Status</Label>
                    <Select
                      value={formData.Status}
                      onValueChange={(v) => onChangeAction("Status", v)}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Select Status" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="Login">Login</SelectItem>
                        <SelectItem value="Logout">Logout</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="grid gap-2">
                    <Label>Remarks</Label>
                    <Textarea
                      value={formData.Remarks}
                      onChange={(e) => onChangeAction("Remarks", e.target.value)}
                      rows={3}
                    />
                  </div>

                  <div className="grid gap-2">
                    <Label>Location</Label>
                    <Input disabled value={locationAddress} />
                  </div>
                </div>
              </>
            )}
          </div>

          {/* RIGHT SIDE: Type + Submit */}
          <div className="flex-1 space-y-4">
            {/* Hidden inputs */}
            <input type="hidden" value={formData.ReferenceID} />
            <input type="hidden" value={formData.Email} />

            {/* Type (disabled and pre-set) */}
            <div className="grid gap-2">
              <Select value="On Field" disabled>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="On Field">On Field</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Submit Button */}
            <Button
              onClick={handleCreate}
              disabled={
                loading ||
                !formData.Status ||
                !capturedImage ||
                locationAddress === "Fetching location..."
              }
              className="mt-4 w-full md:w-auto"
            >
              {loading ? "Saving..." : "Create Attendance"}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
