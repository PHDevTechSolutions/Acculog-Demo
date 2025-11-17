"use client";

import React, { useMemo } from "react";
import type { ActivityLog } from "@/types/activityLog";

interface UserInfo {
  Firstname: string;
  Lastname: string;
  profilePicture?: string;
}

interface DashboardCalendarProps {
  currentMonth: Date;
  setCurrentMonthAction: (date: Date) => void;
  groupedByDate: Record<string, ActivityLog[]>;
  usersMap: Record<string, UserInfo>;
  onEventClickAction: (event: ActivityLog) => void;
}

function toLocalDateKey(date: Date | string) {
  const d = typeof date === "string" ? new Date(date) : date;
  const year = d.getFullYear();
  const month = d.getMonth() + 1;
  const day = d.getDate();
  return `${year}-${month.toString().padStart(2, "0")}-${day.toString().padStart(2, "0")}`;
}

function generateCalendarDays(year: number, month: number): Date[] {
  const days: Date[] = [];
  const firstDayOfMonth = new Date(year, month, 1);
  const lastDayOfMonth = new Date(year, month + 1, 0);
  const firstWeekday = firstDayOfMonth.getDay();

  for (let i = firstWeekday - 1; i >= 0; i--) {
    days.push(new Date(year, month, 1 - i - 1));
  }

  for (let day = 1; day <= lastDayOfMonth.getDate(); day++) {
    days.push(new Date(year, month, day));
  }

  while (days.length % 7 !== 0) {
    const nextDay = new Date(year, month, lastDayOfMonth.getDate() + (days.length - firstWeekday) + 1);
    days.push(nextDay);
  }

  return days;
}

function isSameDay(d1: Date, d2: Date) {
  return (
    d1.getFullYear() === d2.getFullYear() &&
    d1.getMonth() === d2.getMonth() &&
    d1.getDate() === d2.getDate()
  );
}

export default function DashboardCalendar({
  currentMonth,
  setCurrentMonthAction,
  groupedByDate,
  usersMap,
  onEventClickAction,
}: DashboardCalendarProps) {
  const calendarDays = useMemo(() => generateCalendarDays(currentMonth.getFullYear(), currentMonth.getMonth()), [currentMonth]);
  const today = new Date();

  function goToPrevMonth() {
    setCurrentMonthAction(new Date(currentMonth.getFullYear(), currentMonth.getMonth() - 1, 1));
  }

  function goToNextMonth() {
    setCurrentMonthAction(new Date(currentMonth.getFullYear(), currentMonth.getMonth() + 1, 1));
  }

  return (
    <>
      <header className="bg-background sticky top-0 flex h-16 shrink-0 items-center gap-2 border-b px-4">
        <div className="flex-1 font-semibold text-lg">
          Activity Calendar —{" "}
          {currentMonth.toLocaleDateString(undefined, { year: "numeric", month: "long" })}
        </div>

        <div className="ml-auto flex gap-2">
          <button
            onClick={goToPrevMonth}
            className="rounded text-xs border px-3 py-1 hover:bg-gray-100"
            aria-label="Previous Month"
          >
            Prev
          </button>
          <button
            onClick={goToNextMonth}
            className="rounded text-xs border px-3 py-1 hover:bg-gray-100"
            aria-label="Next Month"
          >
            Next
          </button>
        </div>
      </header>

      <div className="grid grid-cols-1 sm:grid-cols-7 gap-1 text-center select-none">
        {/* Weekday headers */}
        {["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"].map((day) => (
          <div key={day} className="font-semibold border-b py-1">
            {day}
          </div>
        ))}

        {/* Days grid */}
        {calendarDays.map((date, idx) => {
          const dateKey = toLocalDateKey(date);
          const logs = groupedByDate[dateKey] || [];
          const isCurrentMonth = date.getMonth() === currentMonth.getMonth();
          const isToday = isSameDay(date, today);

          return (
            <div
              key={idx}
              className={`min-h-[110px] p-2 rounded border flex flex-col ${
                isCurrentMonth ? "bg-white border-gray-300" : "bg-gray-50 text-gray-400 border-gray-200"
              } ${isToday ? "border-blue-500 border-2" : ""}`}
            >
              <div className="text-sm font-semibold mb-1 text-left">{date.getDate()}</div>
              <ul className="text-xs text-left overflow-auto flex-1 space-y-1 max-h-[90px]">
                {logs.length === 0 && <li className="text-gray-400 italic">No events</li>}
                {logs.map((log) => {
                  const user = usersMap[log.ReferenceID];
                  return (
                    <li
                      key={log._id ?? log.date_created}
                      className="truncate bg-blue-100 text-blue-800 rounded px-1 flex items-center space-x-2 cursor-pointer hover:bg-blue-200"
                      title={`${log.Type} - ${log.Status} @ ${new Date(log.date_created).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}`}
                      onClick={() => onEventClickAction(log)}
                    >
                      {user?.profilePicture ? (
                        <img
                          src={user.profilePicture}
                          alt={`${user.Firstname} ${user.Lastname}`}
                          className="w-5 h-5 rounded-full object-cover"
                        />
                      ) : (
                        <div className="w-5 h-5 rounded-full bg-gray-300 flex items-center justify-center text-xs text-gray-600">?</div>
                      )}
                      <span className="flex-1">
                        <strong>{user ? `${user.Firstname} ${user.Lastname}` : "Unknown User"}</strong> - <strong>{log.Type}</strong>: {log.Status}
                      </span>
                    </li>
                  );
                })}
              </ul>
            </div>
          );
        })}
      </div>
    </>
  );
}
