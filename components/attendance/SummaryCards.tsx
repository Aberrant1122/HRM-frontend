"use client";

import { Clock, Timer, LogIn, CalendarDays } from "lucide-react";

interface SummaryCardsProps {
  workingHours: number;
  checkInTime: Date | null;
}

function KpiCard({
  icon: Icon,
  iconBg,
  iconColor,
  value,
  label,
  subtext,
}: {
  icon: React.ElementType;
  iconBg: string;
  iconColor: string;
  value: string;
  label: string;
  subtext: string;
}) {
  return (
    <div className="group rounded-xl border border-gray-200 bg-white p-4 sm:p-6 shadow-sm transition-all duration-300 hover:-translate-y-0.5 hover:shadow-md">
      <div className="flex items-center gap-3 sm:gap-4">
        <div className={`flex h-10 w-10 sm:h-12 sm:w-12 shrink-0 items-center justify-center rounded-lg ${iconBg} transition-colors`}>
          <Icon className={`h-5 w-5 sm:h-6 sm:w-6 ${iconColor}`} />
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-xs font-medium uppercase tracking-wider text-gray-500 truncate">{label}</p>
          <p className="mt-0.5 text-xl sm:text-2xl font-bold tracking-tight text-gray-900">{value}</p>
          <p className="mt-0.5 text-xs text-gray-400 truncate">{subtext}</p>
        </div>
      </div>
    </div>
  );
}

export function SummaryCards({ workingHours, checkInTime }: SummaryCardsProps) {
  const formatCheckIn = (date: Date | null) => {
    if (!date) return "-";
    return date.toLocaleTimeString("en-US", {
      hour: "numeric",
      minute: "2-digit",
      hour12: true,
    });
  };

  const breakTime = "Unknown";

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
      <KpiCard
        icon={Clock}
        iconBg="bg-indigo-50"
        iconColor="text-indigo-600"
        value={`${workingHours.toFixed(1)}h`}
        label="Worked Today"
        subtext="Elapsed clock time; no overtime classification"
      />
      <KpiCard
        icon={Timer}
        iconBg="bg-amber-50"
        iconColor="text-amber-600"
        value={breakTime}
        label="Break Time"
        subtext="Not tracked"
      />
      <KpiCard
        icon={LogIn}
        iconBg="bg-emerald-50"
        iconColor="text-emerald-600"
        value={formatCheckIn(checkInTime)}
        label="Check In"
        subtext={checkInTime ? "Today at" : "Not checked in"}
      />
      <KpiCard
        icon={CalendarDays}
        iconBg="bg-blue-50"
        iconColor="text-blue-600"
        value="Not configured"
        label="Expected Hours"
        subtext="Shift policy awaits review"
      />
    </div>
  );
}
