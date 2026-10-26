import { describe, expect, it } from "vitest";
import { calendarIcs, calendarUrl, WEDDING } from "@/lib/wedding";

describe("Confirmed wedding details", () => {
  it("uses 6 December 2026 in Cairo for the countdown", () => {
    expect(WEDDING.date.toISOString()).toBe("2026-12-05T22:00:00.000Z");
  });
  it("adds 6 December 2026 as an all-day calendar event without inventing a time", () => {
    expect(new URL(calendarUrl()).searchParams.get("dates")).toBe("20261206/20261207");
  });
  it("uses Khaled and Shorouk", () => {
    expect([WEDDING.groom, WEDDING.bride]).toEqual(["Khaled", "Shorouk"]);
    expect([WEDDING.groomAr, WEDDING.brideAr]).toEqual(["خالد", "شروق"]);
  });
  it("opens the exact Google Maps link the couple supplied for Qalaat Green Plaza", () => {
    expect(WEDDING.mapUrl).toBe("https://maps.app.goo.gl/4c6MHErBZk8yKVCw6?g_st=ic");
    expect(WEDDING.venueAr).toBe("قلعة جرين بلازا");
  });
});
describe("Calendar file", () => {
  const ics = calendarIcs({ summary: "S", location: "A, B", reminder: "R" });
  it("is an all-day event on 6 December 2026", () => {
    expect(ics).toContain("DTSTART;VALUE=DATE:20261206");
    expect(ics).toContain("DTEND;VALUE=DATE:20261207");
  });
  it("escapes commas in text fields", () => {
    expect(ics).toContain("LOCATION:A\\, B");
  });
});
