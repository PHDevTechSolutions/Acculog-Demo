"use client";

import React, { useEffect, useRef } from "react";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
  SheetFooter,
} from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Alert, AlertTitle, AlertDescription } from "@/components/ui/alert";
import { Textarea } from "@/components/ui/textarea";

interface TicketDialogProps {
  open: boolean;
  setOpen: (open: boolean) => void;
  editingId?: string | null;
  form: Record<string, any>;
  handleInputChange: (
    e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>
  ) => void;
  handleSelectChange: (name: string, value: string) => void;
  handleSubmit: () => void;
  handleUpdate: () => void;
  resetForm: () => void;
  fullname: string;
  department: string;
  existingTicketIds: string[];
}

function generateTicketID(existingTicketIds: string[]): string {
  const prefix = "DSI";

  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, "0");
  const day = String(now.getDate()).padStart(2, "0");
  const datePart = `${year}-${month}-${day}`;

  const todayIds = existingTicketIds.filter((id) =>
    id.startsWith(`${prefix}-${datePart}`)
  );

  let maxSeq = 0;
  for (const id of todayIds) {
    const parts = id.split("-");
    const seqStr = parts[4];
    const seqNum = parseInt(seqStr, 10);
    if (!isNaN(seqNum) && seqNum > maxSeq) {
      maxSeq = seqNum;
    }
  }

  const nextSeq = String(maxSeq + 1).padStart(3, "0");

  return `${prefix}-${datePart}-${nextSeq}`;
}

export const ReceivedDialog: React.FC<TicketDialogProps> = ({
  open,
  setOpen,
  editingId,
  form,
  handleInputChange,
  handleSelectChange,
  handleSubmit,
  handleUpdate,
  resetForm,
  fullname,
  department,
  existingTicketIds,
}) => {
  const initializedRef = useRef(false);

  useEffect(() => {
    if (open && !editingId && !initializedRef.current) {
      // Generate new ticket ID
      const newTicketId = generateTicketID(existingTicketIds);
      handleInputChange({
        target: { name: "ticket_id", value: newTicketId },
      } as React.ChangeEvent<HTMLInputElement>);

      // Set requestor_name if empty
      if (!form.requestor_name) {
        handleInputChange({
          target: { name: "requestor_name", value: fullname },
        } as React.ChangeEvent<HTMLInputElement>);
      }

      if (!form.department) {
        handleInputChange({
          target: { name: "department", value: department },
        } as React.ChangeEvent<HTMLInputElement>);
      }

      // Fix mode to "Acculog"
      handleInputChange({
        target: { name: "mode", value: "Acculog" },
      } as React.ChangeEvent<HTMLInputElement>);

      // Fix status to "Pending"
      handleSelectChange("status", "Pending");

      initializedRef.current = true;
    }

    if (!open) {
      initializedRef.current = false;
    }
  }, [
    open,
    editingId,
    existingTicketIds,
    fullname,
    handleInputChange,
    handleSelectChange,
    department,
  ]);

  return (
    <Sheet
      open={open}
      onOpenChange={(open) => {
        setOpen(open);
        if (!open) resetForm();
      }}
    >
      <SheetContent side="right" className="w-[420px] sm:w-[540px]">
        <SheetHeader>
          <SheetTitle>{editingId ? "Edit Ticket" : "Add New Ticket"}</SheetTitle>
          <SheetDescription>
            Fill out the form below to {editingId ? "update" : "add"} a ticket.
          </SheetDescription>
        </SheetHeader>

        <div className="mt-6 grid grid-cols-1 gap-4 max-h-[70vh] overflow-auto">
          <div className="flex flex-col gap-4">
            <Alert className="p-4">
              <AlertTitle className="mb-2">Ticket Information</AlertTitle>
              <AlertDescription className="space-y-2">
                <div>
                  <div className="font-semibold text-indigo-900">
                    Ticket ID: {form.ticket_id || "-"}
                  </div>
                  <Input
                    type="hidden"
                    name="ticket_id"
                    value={form.ticket_id || ""}
                  />
                </div>
                <div>
                  <div className="font-semibold text-indigo-900">
                    Full Name: {form.requestor_name || "-"}
                  </div>
                  <Input
                    type="hidden"
                    name="requestor_name"
                    value={form.requestor_name || ""}
                  />
                </div>
                <div>
                  <div className="font-semibold text-indigo-900">
                    Department: {form.department || "-"}
                  </div>
                  <Input
                    type="hidden"
                    name="department"
                    value={form.department || ""}
                  />
                </div>
                <Input type="hidden" name="mode" value="Acculog" />
                <Input type="hidden" name="status" value="Pending" />

                <div className="font-semibold text-indigo-900 mt-4">Status: Pending</div>
              </AlertDescription>
            </Alert>
          </div>

          {/* Ticket Subject */}
          <div className="flex flex-col w-full">
            <label className="mb-1 text-xs font-medium">Ticket Subject</label>
            <Textarea
              name="ticket_subject"
              value={form.ticket_subject || ""}
              onChange={handleInputChange}
              placeholder="Enter the ticket subject"
              rows={20}
              className="capitalize"
            />
          </div>
        </div>

        <SheetFooter className="mt-6 flex justify-end gap-2">
          <Button
            variant="outline"
            onClick={() => {
              setOpen(false);
              resetForm();
            }}
          >
            Cancel
          </Button>
          <Button onClick={editingId ? handleUpdate : handleSubmit}>
            {editingId ? "Update" : "Submit"}
          </Button>
        </SheetFooter>
      </SheetContent>
    </Sheet>
  );
};
