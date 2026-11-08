import { describe, it, expect } from "vitest";
import { scanCalendar, nightState, type PriceDay } from "../src/revenue/calendar-scan";

const L = { listingId: "x", name: "Test", min: 220, base: 330, max: 450 };
const day = (date: string, p: Partial<PriceDay> = {}): PriceDay => ({
  date,
  price: 220,
  user_price: 220,
  uncustomized_price: 160,
  min_stay: 1,
  booking_status: "",
  ...p,
});

describe("revenue calendar scan", () => {
  it("classifies nights", () => {
    expect(nightState(day("2026-12-01"))).toBe("open");
    expect(nightState(day("2026-12-01", { booking_status: "Booked (Check-In)", user_price: -1 }))).toBe("booked");
    expect(nightState(day("2026-12-01", { user_price: -1 }))).toBe("blocked");
  });

  it("flags open nights held up by the minimum price, and ignores nights the algorithm priced above min", () => {
    const s = scanCalendar(L, [
      day("2026-12-01"), // floor: algo 160 < min 220
      day("2026-12-02", { uncustomized_price: 200 }), // floor: gap 20
      day("2026-12-03", { price: 300, user_price: 300, uncustomized_price: 280 }), // not floor
      day("2026-12-04", { booking_status: "Booked", user_price: -1 }), // booked, ignored
    ]);
    expect(s.floorNightCount).toBe(2);
    expect(s.avgFloorGap).toBe(40); // (60 + 20) / 2
    expect(s.lowestAlgorithmPrice).toBe(160);
  });

  it("flags open nights capped by the maximum price", () => {
    const s = scanCalendar(L, [
      day("2027-01-16", { price: 450, user_price: 450, uncustomized_price: 1250 }), // capped, gap 800
      day("2027-01-17", { price: 450, user_price: 450, uncustomized_price: 450 }), // at max but algo agrees
      day("2027-01-18", { price: 450, user_price: -1, uncustomized_price: 1400, booking_status: "Booked" }), // booked
    ]);
    expect(s.capNightCount).toBe(1);
    expect(s.avgCapGap).toBe(800);
  });

  it("finds open gaps shorter than the minimum stay between bookings", () => {
    const s = scanCalendar(L, [
      day("2026-12-01", { booking_status: "Booked", user_price: -1 }),
      day("2026-12-02", { min_stay: 2, price: 300, user_price: 300, uncustomized_price: 300 }),
      day("2026-12-03", { booking_status: "Booked", user_price: -1 }),
    ]);
    expect(s.orphanGaps).toEqual([{ start: "2026-12-02", nights: 1, minStay: 2 }]);
  });

  it("summarizes peak windows", () => {
    const s = scanCalendar(
      L,
      [
        day("2027-01-15", { price: 400, user_price: 400, uncustomized_price: 400 }),
        day("2027-01-16", { booking_status: "Booked", user_price: -1 }),
        day("2027-01-17", { price: 300, user_price: 300, uncustomized_price: 300 }),
      ],
      [{ name: "MLK", start: "2027-01-15", end: "2027-01-17" }],
    );
    expect(s.peaks[0]).toEqual({ name: "MLK", nights: 3, open: 2, booked: 1, blocked: 0, avgOpenPrice: 350 });
  });
});
