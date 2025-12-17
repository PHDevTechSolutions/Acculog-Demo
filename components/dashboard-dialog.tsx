import React from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

interface ActivityLog {
  ReferenceID: string;
  Type: string;
  Status: string;
  Location: string;
  date_created: string;
  Remarks: string;
  _id?: string;
}

interface UserInfo {
  Firstname: string;
  Lastname: string;
  profilePicture?: string;
}

interface ActivityDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  selectedEvent: ActivityLog | null;
  usersMap: Record<string, UserInfo>;
}

export default function ActivityDialog({
  open,
  onOpenChange,
  selectedEvent,
  usersMap,
}: ActivityDialogProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="w-full max-w-xs sm:max-w-md md:max-w-lg mx-auto px-4 sm:px-6 md:px-8 rounded-lg">
        <DialogHeader>
          <DialogTitle>Event Details</DialogTitle>
          <div className="text-xs text-left text-muted-foreground mt-2">
            {selectedEvent ? (
              <>
                <p>
                  <strong>User:</strong>{" "}
                  {usersMap[selectedEvent.ReferenceID]
                    ? `${usersMap[selectedEvent.ReferenceID].Firstname} ${usersMap[selectedEvent.ReferenceID].Lastname}`
                    : "Unknown User"}
                </p>
                <p>
                  <strong>Type:</strong> {selectedEvent.Type}
                </p>
                <p>
                  <strong>Status:</strong> {selectedEvent.Status}
                </p>
                <p>
                  <strong>Location:</strong> {selectedEvent.Location}
                </p>
                <p>
                  <strong>Date:</strong>{" "}
                  {new Date(selectedEvent.date_created).toLocaleString()}
                </p>
                {selectedEvent.Remarks && (
                  <p>
                    <strong>Remarks:</strong> {selectedEvent.Remarks}
                  </p>
                )}
              </>
            ) : (
              <p>No event selected.</p>
            )}
          </div>
        </DialogHeader>
      </DialogContent>
    </Dialog>
  );
}
