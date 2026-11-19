// Employment dates and birthdays are calendar values, not instants to shift
// into the viewer's time zone. Keep the API's date portion unchanged.
export function formatCalendarDate(
  value: string | null | undefined,
  options?: Intl.DateTimeFormatOptions,
  locale?: string
): string {
  if (!value || !/^\d{4}-\d{2}-\d{2}/.test(value)) return "N/A";
  const date = new Date(`${value.slice(0, 10)}T00:00:00Z`);
  if (Number.isNaN(date.getTime())) return "N/A";
  return date.toLocaleDateString(locale, { ...options, timeZone: "UTC" });
}
