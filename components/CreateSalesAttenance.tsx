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
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectTrigger,
  SelectContent,
  SelectItem,
  SelectValue,
} from "@/components/ui/select";
import {
  Alert,
  AlertDescription,
  AlertTitle,
} from "@/components/ui/alert";
import { MapPin } from "lucide-react";
import { Button } from "@/components/ui/button";

import ManualLocationPicker from "./manual-location-picker";

interface FormData {
  ReferenceID: string;
  TSM: string;
  Email: string;
  Type: string;
  Status: string;
  PhotoURL: string;
  Remarks: string;
  _id?: string;
}

interface UserDetails {
  ReferenceID: string;
  TSM: string;
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
  const [siteCapturedImage, setSiteCapturedImage] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const [lastStatus, setLastStatus] = useState<"Login" | "Logout" | null>(null);
  const [lastTime, setLastTime] = useState<string | null>(null);

  const [manualLat, setManualLat] = useState<number | null>(null);
  const [manualLng, setManualLng] = useState<number | null>(null);

  const [loginCountToday, setLoginCountToday] = useState(0);

  useEffect(() => {
    setManualLat(null);
    setManualLng(null);
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
      () => {
        setLocationAddress("Location not allowed by user");
        setLatitude(null);
        setLongitude(null);
      },
      { enableHighAccuracy: true, timeout: 10000, maximumAge: 0 }
    );

    return () => {
      setCapturedImage(null);
      setSiteCapturedImage(null);
    };
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

  useEffect(() => {
    if (!open) return;

    let interval: NodeJS.Timeout;

    const fetchSummary = async () => {
      const res = await fetch(
        `/api/ModuleSales/Activity/LoginSummary?referenceId=${userDetails.ReferenceID}`
      );
      if (!res.ok) return;

      const data = await res.json();

      setLastStatus(data.lastStatus);
      setLoginCountToday(data.loginCount);

      if (data.lastTime) {
        setLastTime(
          new Date(data.lastTime).toLocaleTimeString("en-PH", {
            hour: "2-digit",
            minute: "2-digit",
          })
        );
      }
    };

    fetchSummary();

    interval = setInterval(fetchSummary, 3000);

    return () => clearInterval(interval);
  }, [userDetails.ReferenceID, open]);

  const handleCreate = async () => {
    if (!formData.Status) {
      toast.error("Please select Login or Logout.");
      return;
    }

    if (!capturedImage) {
      toast.error("Please capture a photo first.");
      return;
    }

    if (!locationAddress || locationAddress === "Fetching location...") {
      toast.error("Location not ready yet.");
      return;
    }

    if (formData.Type === "Site Visit" && !siteCapturedImage) {
      toast.error("Please capture Site Visit photo.");
      return;
    }

    setLoading(true);
    try {
      const photoURL = await uploadToCloudinary(capturedImage);
      let sitePhotoURL: string | null = null;

      if (formData.Type === "Site Visit" && siteCapturedImage) {
        sitePhotoURL = await uploadToCloudinary(siteCapturedImage);
      }

      const payload = {
        ...formData,
        PhotoURL: photoURL,
        SitePhotoURL: sitePhotoURL,
        Location: locationAddress,
        Latitude: manualLat ?? latitude,
        Longitude: manualLng ?? longitude,
      };

      const response = await fetch("/api/ModuleSales/Activity/AddLog", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      if (!response.ok) throw new Error();

      toast.success("Attendance created!");
      fetchAccountAction();
      onOpenChangeAction(false);

      setFormAction({
        ReferenceID: userDetails.ReferenceID,
        Email: userDetails.Email,
        Type: "TSA",
        Status: "",
        PhotoURL: "",
        Remarks: "",
        TSM: userDetails.TSM,
      });

      setCapturedImage(null);
      setSiteCapturedImage(null);
    } catch {
      toast.error("Error saving attendance.");
    }
    setLoading(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChangeAction}>
      <DialogContent className="rounded-lg max-h-[90vh] overflow-y-auto w-full max-w-lg">
        <DialogHeader>
          <DialogTitle>Create Sales Attendance</DialogTitle>
        </DialogHeader>

        <div className="flex flex-col gap-4 mt-4">
          {lastStatus && (
            <div className="rounded-lg border bg-gray-50 px-3 py-2 text-xs">
              <p>
                <strong>Current Status:</strong>{" "}
                <span
                  className={
                    lastStatus === "Login"
                      ? "text-green-600 font-semibold"
                      : "text-red-600 font-semibold"
                  }
                >
                  {lastStatus === "Login" ? "Logged In" : "Logged Out"}
                </span>
              </p>

              {lastTime && <p className="text-gray-500 mt-1">Last activity: {lastTime}</p>}

              <p className="mt-1 text-blue-600 font-semibold">
                Total logins today: {loginCountToday}
              </p>
            </div>
          )}

          <Camera onCaptureAction={(img) => setCapturedImage(img)} />

          {capturedImage && (
            <>
              <div className="grid gap-2">
                <Label>Status</Label>
                <Select value={formData.Status} onValueChange={(v) => onChangeAction("Status", v)}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select Status" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Login" disabled={lastStatus === "Login"}>
                      Login {lastStatus === "Login" && "(Current)"}
                    </SelectItem>
                    <SelectItem value="Logout" disabled={lastStatus === "Logout"}>
                      Logout {lastStatus === "Logout" && "(Current)"}
                    </SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="grid gap-2">
                <Label>Type</Label>
                <Select value={formData.Type} onValueChange={(v) => onChangeAction("Type", v)}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select Type" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Client Visit">On Field</SelectItem>
                    <SelectItem value="Site Visit">Site Visit</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {formData.Type === "Site Visit" && (
                <div className="grid gap-2">
                  <Label>Site Visit Photo</Label>
                  <Camera onCaptureAction={(img) => setSiteCapturedImage(img)} />
                </div>
              )}

              <div className="grid gap-2">
                <Label>Remarks</Label>
                <Textarea
                  value={formData.Remarks}
                  onChange={(e) => onChangeAction("Remarks", e.target.value)}
                />
              </div>

              <Alert className="text-xs">
                <MapPin className="w-4 h-4 text-blue-500" />
                <AlertTitle className="font-bold">My Location</AlertTitle>
                <AlertDescription>{locationAddress}</AlertDescription>
              </Alert>

              {formData.Type === "Site Visit" && (
                <div className="mt-2">
                  <ManualLocationPicker
                    latitude={manualLat ?? latitude}
                    longitude={manualLng ?? longitude}
                    onChange={(lat, lng, address) => {
                      setManualLat(lat);
                      setManualLng(lng);
                      if (address) {
                        setLocationAddress(address);
                      }
                    }}
                  />
                </div>
              )}

              <Button
                onClick={handleCreate}
                disabled={
                  loading ||
                  !formData.Status ||
                  !capturedImage ||
                  locationAddress === "Fetching location..."
                }
              >
                {loading ? "Saving..." : "Create Attendance"}
              </Button>
            </>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
