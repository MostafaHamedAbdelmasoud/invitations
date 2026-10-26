export const WEDDING = {
  groom: "Khaled",
  groomAr: "خالد",
  bride: "Shorouk",
  brideAr: "شروق",
  date: new Date("2026-12-06T00:00:00+02:00"),
  calendarDate: "20261206",
  calendarEndDate: "20261207",
  venue: "Green Plaza Castle",
  venueAr: "قلعة جرين بلازا",
  // No street address was supplied, so none is shown.
  venueAddress: "",
  venueAddressAr: "",
  // No coordinates were supplied: the embedded map searches the hall's name,
  // and "Directions" opens the exact Google Maps link the couple sent.
  lat: null as number | null,
  lng: null as number | null,
  mapQuery: "قلعة جرين بلازا",
  mapUrl: "https://maps.app.goo.gl/4c6MHErBZk8yKVCw6?g_st=ic",
};

export function calendarUrl() {
  const params = new URLSearchParams({
    action: "TEMPLATE",
    text: "زفاف خالد وشروق | Khaled & Shorouk Wedding",
    dates: `${WEDDING.calendarDate}/${WEDDING.calendarEndDate}`,
    location: `${WEDDING.venueAr} | ${WEDDING.venue}`,
    ctz: "Africa/Cairo",
  });
  return `https://calendar.google.com/calendar/render?${params}`;
}
/** Guest links are built on the address the invitation is served from (?to=<name>),
 *  so they always point to this couple's own site, whatever domain it is deployed on. */
export function siteUrl() {
  return typeof window !== "undefined" ? window.location.origin + "/" : "";
}

/** An all-day .ics event for 6 December 2026 (no time is confirmed yet), with a reminder the day before. */
export function calendarIcs({
  summary,
  location,
  reminder,
}: {
  summary: string;
  location: string;
  reminder: string;
}) {
  const esc = (v: string) => v.replace(/[;,\\]/g, (c) => `\\${c}`);
  const stamp = new Date()
    .toISOString()
    .replace(/[-:]/g, "")
    .replace(/\.\d{3}/, "");
  return [
    "BEGIN:VCALENDAR",
    "VERSION:2.0",
    "PRODID:-//khaled-shorouk//invite//AR",
    "CALSCALE:GREGORIAN",
    "BEGIN:VEVENT",
    `UID:wedding-${WEDDING.calendarDate}-khaled-shorouk@invite`,
    `DTSTAMP:${stamp}`,
    `DTSTART;VALUE=DATE:${WEDDING.calendarDate}`,
    `DTEND;VALUE=DATE:${WEDDING.calendarEndDate}`,
    `SUMMARY:${esc(summary)}`,
    `LOCATION:${esc(location)}`,
    ...(siteUrl() ? [`URL:${siteUrl()}`] : []),
    "BEGIN:VALARM",
    "TRIGGER:-P1D",
    "ACTION:DISPLAY",
    `DESCRIPTION:${esc(reminder)}`,
    "END:VALARM",
    "END:VEVENT",
    "END:VCALENDAR",
  ].join("\r\n");
}
