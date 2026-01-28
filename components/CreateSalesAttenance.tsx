"use client";

import dynamic from "next/dynamic";
import React, { useEffect, useState } from "react";
import { toast } from "sonner";
import Camera from "./camera";

import { Dialog, DialogContent, DialogHeader, DialogTitle, } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectTrigger, SelectContent, SelectItem, SelectValue, } from "@/components/ui/select";
import { Alert, AlertDescription, AlertTitle, } from "@/components/ui/alert";

import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group"
import { Field, FieldContent, FieldDescription, FieldLabel, FieldTitle, } from "@/components/ui/field"
import { MapPin, CheckCircleIcon } from "lucide-react";
import { Button } from "@/components/ui/button";

const ManualLocationPicker = dynamic(
  () => import("./manual-location-picker"),
  { ssr: false }
);

/* ================= TYPES ================= */

interface FormData {
  ReferenceID: string;
  TSM: string;
  Email: string;
  Type: string;
  Status: string;
  PhotoURL: string;
  Remarks: string;
  SiteVisitAccount?: string;
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
  onChangeAction: (field: keyof FormData, value: any) => void;
  userDetails: UserDetails;
  fetchAccountAction: () => void;
  setFormAction: React.Dispatch<React.SetStateAction<FormData>>;
}

/* ================= COMPONENT ================= */

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

  const [manualLat, setManualLat] = useState<number | null>(null);
  const [manualLng, setManualLng] = useState<number | null>(null);

  const [capturedImage, setCapturedImage] = useState<string | null>(null);
  const [siteCapturedImage, setSiteCapturedImage] = useState<string | null>(null);

  const [loading, setLoading] = useState(false);

  const [lastStatus, setLastStatus] =
    useState<"Login" | "Logout" | null>(null);
  const [lastTime, setLastTime] = useState<string | null>(null);
  const [loginCountToday, setLoginCountToday] = useState(0);

  const [siteVisitAccounts, setSiteVisitAccounts] = useState<
    { company_name: string }[]
  >([]);
  const [loadingAccounts, setLoadingAccounts] = useState(false);
  const [accountsError, setAccountsError] = useState<string | null>(null);

  // New state for client type selection
  const [clientType, setClientType] = useState<"existing" | "new">("existing");

  /* ================= FIX TYPE ================= */

  useEffect(() => {
    if (!open) return;
    if (formData.Type !== "Site Visit") {
      onChangeAction("Type", "Site Visit");
    }
  }, [open]);

  /* ================= FETCH SITE VISIT ACCOUNTS ================= */

  useEffect(() => {
    if (!open) return;

    setLoadingAccounts(true);
    setAccountsError(null);

    fetch(
      `/api/fetch-account?referenceid=${encodeURIComponent(
        userDetails.ReferenceID
      )}`,
      { cache: "no-store" }
    )
      .then((res) => {
        if (!res.ok) throw new Error("Failed to fetch accounts");
        return res.json();
      })
      .then((json) => {
        if (json.success) {
          setSiteVisitAccounts(json.data || []);
        } else {
          setAccountsError(json.error || "No accounts found");
        }
      })
      .catch((err) => {
        setAccountsError(err.message || "Error fetching accounts");
      })
      .finally(() => {
        setLoadingAccounts(false);
      });
  }, [open, userDetails.ReferenceID]);

  /* ================= GEOLOCATION ================= */

  useEffect(() => {
    if (!open) return;

    setManualLat(null);
    setManualLng(null);

    navigator.geolocation.getCurrentPosition(
      ({ coords }) => {
        setLatitude(coords.latitude);
        setLongitude(coords.longitude);

        fetch(
          `https://nominatim.openstreetmap.org/reverse?format=json&lat=${coords.latitude}&lon=${coords.longitude}`
        )
          .then((res) => res.json())
          .then((data) =>
            setLocationAddress(data.display_name || "Location detected")
          )
          .catch(() =>
            setLocationAddress("Location detected (no address)")
          );
      },
      () => {
        setLocationAddress("Location not allowed by user");
        setLatitude(null);
        setLongitude(null);
      },
      { enableHighAccuracy: true }
    );

    return () => {
      setCapturedImage(null);
      setSiteCapturedImage(null);
    };
  }, [open]);

  /* ================= UPLOAD IMAGE ================= */

  const uploadToCloudinary = async (base64: string) => {
    const imgData = new FormData();
    imgData.append("file", base64);
    imgData.append("upload_preset", "Xchire");

    const res = await fetch(
      "https://api.cloudinary.com/v1_1/dhczsyzcz/image/upload",
      { method: "POST", body: imgData }
    );

    const data = await res.json();
    return data.secure_url;
  };

  /* ================= FETCH LOGIN SUMMARY ================= */

  useEffect(() => {
    if (!open) return;

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
    const interval = setInterval(fetchSummary, 3000);
    return () => clearInterval(interval);
  }, [open, userDetails.ReferenceID]);

  /* ================= SUBMIT ================= */

  const handleCreate = async () => {
    if (!formData.Status) {
      return toast.error("Please select Login or Logout.");
    }

    if (!capturedImage) {
      return toast.error("Please capture a photo first.");
    }

    if (!locationAddress || locationAddress === "Fetching location...") {
      return toast.error("Location not ready yet.");
    }

    if (formData.Status !== "Logout" && !siteCapturedImage) {
      return toast.error("Please capture Site Visit photo.");
    }

    if (clientType === "existing" && !formData.SiteVisitAccount) {
      return toast.error("Please select an existing client account.");
    }

    setLoading(true);

    try {
      const photoURL = await uploadToCloudinary(capturedImage);
      const sitePhotoURL =
        siteCapturedImage && formData.Status !== "Logout"
          ? await uploadToCloudinary(siteCapturedImage)
          : null;

      const payload = {
        ...formData,
        Type: "Site Visit",
        PhotoURL: photoURL,
        SitePhotoURL: sitePhotoURL,
        Location: locationAddress,
        Latitude: manualLat ?? latitude,
        Longitude: manualLng ?? longitude,
        SiteVisitAccount: clientType === "new" ? "" : formData.SiteVisitAccount,
      };

      const response = await fetch("/api/ModuleSales/Activity/AddLog", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      if (!response.ok) {
        const err = await response.json();
        return toast.error(err.error || "Error saving attendance.");
      }

      toast.success("Attendance created!");
      fetchAccountAction();
      onOpenChangeAction(false);

      setFormAction({
        ReferenceID: userDetails.ReferenceID,
        Email: userDetails.Email,
        TSM: userDetails.TSM,
        Type: "Site Visit",
        Status: "",
        PhotoURL: "",
        Remarks: "",
        SiteVisitAccount: "",
      });

      setCapturedImage(null);
      setSiteCapturedImage(null);
      setClientType("existing"); // reset to default
    } catch (err) {
      console.error(err);
      toast.error("Error saving attendance.");
    } finally {
      setLoading(false);
    }
  };

  /* ================= UI ================= */

  return (
    <Dialog open={open} onOpenChange={onOpenChangeAction}>
      <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Create Attendance</DialogTitle>
        </DialogHeader>

        <div className="flex flex-col gap-4 mt-4">
          {lastStatus && (
            <div className="border rounded-lg bg-gray-50 p-3 text-xs">
              <p>
                <strong>Status:</strong>{" "}
                <span
                  className={
                    lastStatus === "Login"
                      ? "text-green-600 font-semibold"
                      : "text-red-600 font-semibold"
                  }
                >
                  {lastStatus}
                </span>
              </p>
              {lastTime && <p>Last activity: {lastTime}</p>}
              <p className="text-blue-600 font-semibold">
                Total logins today: {loginCountToday}
              </p>
            </div>
          )}

          <Camera onCaptureAction={setCapturedImage} />

          {capturedImage && (
            <>
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

              {/* New Client Type Checkbox */}
              <div className="grid gap-1 text-xs">
                <Label>Client Type</Label>
                <RadioGroup
                  value={clientType}
                  onValueChange={(v: "existing" | "new") => setClientType(v)}
                >
                  <FieldLabel htmlFor="existing-client">
                    <Field orientation="horizontal" className="cursor-pointer">
                      <FieldContent>
                        <FieldTitle>Existing Client</FieldTitle>
                        <FieldDescription>
                          Select this if client already exists.
                        </FieldDescription>
                      </FieldContent>
                      <RadioGroupItem value="existing" id="existing-client" />
                    </Field>
                  </FieldLabel>
                  <FieldLabel htmlFor="new-client">
                    <Field orientation="horizontal" className="cursor-pointer">
                      <FieldContent>
                        <FieldTitle>New Client</FieldTitle>
                        <FieldDescription>
                          Select this if this is a new client.
                        </FieldDescription>
                      </FieldContent>
                      <RadioGroupItem value="new" id="new-client" />
                    </Field>
                  </FieldLabel>
                </RadioGroup>
              </div>

              {clientType === "existing" && (
                <div className="grid gap-2">
                  <Label>Site Visit Account</Label>
                  {loadingAccounts ? (
                    <p className="text-xs text-gray-500">Loading accounts...</p>
                  ) : accountsError ? (
                    <p className="text-xs text-red-500">{accountsError}</p>
                  ) : (
                    <Select
                      value={formData.SiteVisitAccount || ""}
                      onValueChange={(v) =>
                        onChangeAction("SiteVisitAccount", v)
                      }
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Select Account" />
                      </SelectTrigger>
                      <SelectContent>
                        {siteVisitAccounts.map((acc) => (
                          <SelectItem
                            key={acc.company_name}
                            value={acc.company_name}
                          >
                            {acc.company_name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  )}
                </div>
              )}

              <div className="grid gap-2">
                <Label>Site Visit Photo</Label>
                <Camera onCaptureAction={setSiteCapturedImage} />
              </div>

              <div className="grid gap-2">
                <Label>Remarks</Label>
                <Textarea
                  value={formData.Remarks}
                  onChange={(e) =>
                    onChangeAction("Remarks", e.target.value)
                  }
                />
              </div>

              <Alert className="text-xs">
                <MapPin className="w-4 h-4 text-blue-500" />
                <AlertTitle>My Location</AlertTitle>
                <AlertDescription>{locationAddress}</AlertDescription>
              </Alert>

              <ManualLocationPicker
                latitude={manualLat ?? latitude}
                longitude={manualLng ?? longitude}
                onChange={(lat, lng, address) => {
                  setManualLat(lat);
                  setManualLng(lng);
                  if (address) setLocationAddress(address);
                }}
              />

              <Button
                className="bg-green-600 text-lg p-6"
                onClick={handleCreate}
                disabled={loading}
              >
                <CheckCircleIcon />
                {loading ? "Saving..." : "Create Attendance"}
              </Button>
            </>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
