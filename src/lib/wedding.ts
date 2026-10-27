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
  mapUrl: "https://maps.app.goo.gl/tUz6WAtgsbLfYs2q8",
  // The live map in the venue card: Google's own embed code for the hall (shows its pin).
  mapEmbedUrl:
    "https://www.google.com/maps/embed?pb=!1m14!1m8!1m3!1d6408.529831157416!2d31.188689222290034!3d29.9712168!3m2!1i1024!2i768!4f13.1!3m3!1m2!1s0x1458470026d76b81%3A0x23503eb2f3c8f43f!2z2YLYp9i52Kkg2KzYsdmK2YYg2KjZhNin2LLYpw!5e1!3m2!1sar!2sus!4v1793064130876!5m2!1sar!2sus",
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
  // the site's own folder too (import.meta.env.BASE_URL), e.g. https://<user>.github.io/khaled-shorouk/
  return typeof window !== "undefined" ? window.location.origin + import.meta.env.BASE_URL : "";
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
