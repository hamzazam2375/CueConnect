import { afterEach, describe, test } from "node:test";
import assert from "node:assert/strict";
import { clubToday, clubTodayKey, slotHasStarted, slotStartInstant } from "../src/utils/clubTime.js";

// Pakistan is UTC+5 all year, so 6:00 PM in Karachi is 13:00 UTC
afterEach(() => { delete process.env.CLUB_TIME_ZONE; });

describe("club time (Asia/Karachi by default)", () => {
    test("a slot starts at the club's wall-clock time, not UTC", () => {
        assert.equal(slotStartInstant("2026-11-20", 18 * 60).toISOString(), "2026-11-20T13:00:00.000Z");
        assert.equal(slotStartInstant(new Date("2026-11-20T00:00:00.000Z"), 12 * 60).toISOString(), "2026-11-20T07:00:00.000Z");
    });

    test("after-midnight slots (1440+) land on the next morning", () => {
        // 1:00 AM on the 21st in Karachi
        assert.equal(slotStartInstant("2026-11-20", 25 * 60).toISOString(), "2026-11-20T20:00:00.000Z");
    });

    test("a 3:00 PM slot has started at 4:00 PM Karachi time (the old UTC check said it hadn't)", () => {
        const fourPmKarachi = new Date("2026-11-20T11:00:00.000Z");
        assert.equal(slotHasStarted("2026-11-20", 15 * 60, fourPmKarachi), true);
        assert.equal(slotHasStarted("2026-11-20", 17 * 60, fourPmKarachi), false);
    });

    test("'today' changes at midnight in Karachi, not at 5:00 AM", () => {
        assert.equal(clubTodayKey(new Date("2026-11-20T18:59:00.000Z")), "2026-11-20"); // 11:59 PM
        assert.equal(clubTodayKey(new Date("2026-11-20T19:00:00.000Z")), "2026-11-21"); // midnight
        assert.equal(clubToday(new Date("2026-11-20T20:00:00.000Z")).toISOString(), "2026-11-21T00:00:00.000Z");
    });
});

describe("CLUB_TIME_ZONE", () => {
    test("can be set to another zone", () => {
        process.env.CLUB_TIME_ZONE = "UTC";
        assert.equal(slotStartInstant("2026-11-20", 18 * 60).toISOString(), "2026-11-20T18:00:00.000Z");
    });

    test("handles daylight saving time", () => {
        process.env.CLUB_TIME_ZONE = "Europe/London";
        assert.equal(slotStartInstant("2026-07-01", 18 * 60).toISOString(), "2026-07-01T17:00:00.000Z"); // summer, UTC+1
        assert.equal(slotStartInstant("2026-12-01", 18 * 60).toISOString(), "2026-12-01T18:00:00.000Z"); // winter, UTC+0
    });
});
