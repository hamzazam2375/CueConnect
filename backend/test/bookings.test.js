import { after, before, describe, mock, test } from "node:test";
import assert from "node:assert/strict";
import { dayKey, startTestServer } from "./helpers.js";

let t, club;
before(async () => {
    t = await startTestServer();
    club = await t.createBranch();
});
after(async () => { await t.stop(); });

// centuryRate 10 → hourly rate 600
const newTable = (overrides) => t.createTable(club.admin, { centuryRate: 10, ...overrides });
const book = (client, fields) => client.post("/client/bookings", t.bookingForm({ accountId: club.accountId, ...fields }));
const adminBookingId = async (reference) => (await club.admin.get("/admin/bookings")).body.bookings.find((item) => item.reference === reference).id;
const givePoints = async (userId, points) => {
    const { default: Loyalty } = await import("../src/models/loyalty.js");
    await Loyalty.create({ user: userId, branchId: club.branch._id, points, history: [{ type: "earned", points, description: "Test points", date: new Date() }] });
};

describe("creating a booking", () => {
    test("a valid request creates a pending booking priced from the hourly rate, with a 50% advance", async () => {
        const table = await newTable();
        const { client } = await t.createClient();
        const response = await book(client, { tableId: table.id, date: dayKey(2), startTime: 18 * 60, duration: 2 });
        assert.equal(response.status, 201, JSON.stringify(response.body));
        const booking = response.body.booking;
        assert.equal(booking.status, "pending");
        assert.equal(booking.total, 1200);
        assert.equal(booking.advanceAmount, 600);
        assert.equal(booking.hasPaymentProof, true);

        const proof = await client.get(`/client/bookings/${booking.reference}/payment-proof`);
        assert.equal(proof.status, 200);
        assert.match(proof.headers.get("content-type"), /image\/png/);
    });

    test("a slot can't overlap another pending or approved booking on the same table", async () => {
        const table = await newTable();
        const first = await t.createClient();
        const second = await t.createClient();
        assert.equal((await book(first.client, { tableId: table.id, date: dayKey(3), startTime: 18 * 60, duration: 2 })).status, 201);
        const overlap = await book(second.client, { tableId: table.id, date: dayKey(3), startTime: 19 * 60, duration: 1 });
        assert.equal(overlap.status, 409);
        const rightAfter = await book(second.client, { tableId: table.id, date: dayKey(3), startTime: 20 * 60, duration: 1 });
        assert.equal(rightAfter.status, 201);
    });

    test("schedule limits: 1–3 hours, on the hour, inside club hours, within 30 days, not in the past", async () => {
        const table = await newTable();
        const { client } = await t.createClient();
        const cases = [
            [{ duration: 4 }, /1, 2, or 3 hours/],
            [{ startTime: 18 * 60 + 30 }, /valid start time/],
            [{ startTime: 10 * 60 }, /valid start time/], // opens at 12:00
            [{ startTime: 25 * 60, duration: 2 }, /outside club hours/], // closes at 2:00 AM
            [{ date: dayKey(31) }, /30 days/],
            [{ date: dayKey(-1) }, /30 days/]
        ];
        for (const [fields, message] of cases) {
            const response = await book(client, { tableId: table.id, date: dayKey(4), startTime: 18 * 60, duration: 1, ...fields });
            assert.equal(response.status, 400, JSON.stringify(fields));
            assert.match(response.body.message, message, JSON.stringify(fields));
        }
    });

    test("tables under maintenance can't be booked", async () => {
        const table = await newTable({ status: "maintenance" });
        const { client } = await t.createClient();
        const response = await book(client, { tableId: table.id, date: dayKey(2) });
        assert.equal(response.status, 400);
    });

    test("a transaction ID pays for only one booking", async () => {
        const table = await newTable();
        const { client } = await t.createClient();
        assert.equal((await book(client, { tableId: table.id, date: dayKey(5), startTime: 14 * 60, transactionId: "SAMEID123" })).status, 201);
        const reused = await book(client, { tableId: table.id, date: dayKey(5), startTime: 16 * 60, transactionId: "sameid123" });
        assert.equal(reused.status, 409);
        assert.match(reused.body.message, /already been used/);
    });

    test("payment proof must be a real JPG, PNG, or WEBP image", async () => {
        const table = await newTable();
        const { client } = await t.createClient();
        const missing = await book(client, { tableId: table.id, date: dayKey(6), proof: null });
        assert.equal(missing.status, 400);
        const fake = await book(client, { tableId: table.id, date: dayKey(6), proof: Buffer.from("not really a png"), proofType: "image/png" });
        assert.equal(fake.status, 400);
        const pdf = await book(client, { tableId: table.id, date: dayKey(6), proof: Buffer.from("%PDF-1.4"), proofType: "application/pdf" });
        assert.equal(pdf.status, 400);
    });

    test("someone else's booking and proof are not visible", async () => {
        const table = await newTable();
        const owner = await t.createClient();
        const other = await t.createClient();
        const { reference } = (await book(owner.client, { tableId: table.id, date: dayKey(7) })).body.booking;
        assert.equal((await other.client.get(`/client/bookings/${reference}`)).status, 404);
        assert.equal((await other.client.get(`/client/bookings/${reference}/payment-proof`)).status, 404);
    });
});

describe("loyalty points on bookings", () => {
    test("points can cover up to 20% of the total, and are spent from the balance", async () => {
        const table = await newTable();
        const { client, userId } = await t.createClient();
        await givePoints(userId, 500);

        const tooMany = await book(client, { tableId: table.id, date: dayKey(8), duration: 2, loyaltyPoints: 241 });
        assert.equal(tooMany.status, 400);
        assert.match(tooMany.body.message, /up to 240 points/);

        const response = await book(client, { tableId: table.id, date: dayKey(8), duration: 2, loyaltyPoints: 240 });
        assert.equal(response.status, 201);
        assert.equal(response.body.booking.total, 960);
        assert.equal((await client.get("/client/loyalty")).body.points, 260);
    });

    test("points are returned when the booking is cancelled", async () => {
        const table = await newTable();
        const { client, userId } = await t.createClient();
        await givePoints(userId, 100);
        const { reference } = (await book(client, { tableId: table.id, date: dayKey(9), loyaltyPoints: 100 })).body.booking;
        assert.equal((await client.get("/client/loyalty")).body.points, 0);

        const cancel = await client.patch(`/client/bookings/${reference}/cancel`, { reason: "Plans changed" });
        assert.equal(cancel.status, 200);
        assert.equal(cancel.body.booking.status, "cancelled");
        assert.equal((await client.get("/client/loyalty")).body.points, 100);
    });

    test("points are returned when the club rejects the booking", async () => {
        const table = await newTable();
        const { client, userId } = await t.createClient();
        await givePoints(userId, 50);
        const { reference } = (await book(client, { tableId: table.id, date: dayKey(10), loyaltyPoints: 50 })).body.booking;
        const reject = await club.admin.patch(`/admin/bookings/${await adminBookingId(reference)}`, { status: "rejected", reason: "Payment not received" });
        assert.equal(reject.status, 200, JSON.stringify(reject.body));
        assert.equal((await client.get("/client/loyalty")).body.points, 50);
        assert.equal((await client.get(`/client/bookings/${reference}`)).body.booking.status, "rejected");
    });
});

describe("changing a booking", () => {
    test("a pending booking can be rescheduled, which reprices it", async () => {
        const table = await newTable();
        const { client } = await t.createClient();
        const { reference } = (await book(client, { tableId: table.id, date: dayKey(11), duration: 1 })).body.booking;
        const moved = await client.patch(`/client/bookings/${reference}/reschedule`, { date: dayKey(12), startTime: 15 * 60, duration: 3 });
        assert.equal(moved.status, 200, JSON.stringify(moved.body));
        assert.equal(moved.body.booking.startTime, 15 * 60);
        assert.equal(moved.body.booking.total, 1800);
    });

    test("a pending booking can move to another free table, but not onto a taken one", async () => {
        const first = await newTable();
        const second = await newTable();
        const { client } = await t.createClient();
        const other = await t.createClient();
        const { reference } = (await book(client, { tableId: first.id, date: dayKey(13), startTime: 20 * 60 })).body.booking;
        await book(other.client, { tableId: second.id, date: dayKey(13), startTime: 20 * 60 });

        assert.equal((await client.patch(`/client/bookings/${reference}/table`, { tableId: second.id })).status, 409);
        const third = await newTable();
        const moved = await client.patch(`/client/bookings/${reference}/table`, { tableId: third.id });
        assert.equal(moved.status, 200);
        assert.equal(moved.body.booking.tableId, third.id);
    });

    test("approved bookings can be cancelled but not rescheduled", async () => {
        const table = await newTable();
        const { client } = await t.createClient();
        const { reference } = (await book(client, { tableId: table.id, date: dayKey(14) })).body.booking;
        assert.equal((await club.admin.patch(`/admin/bookings/${await adminBookingId(reference)}`, { status: "approved" })).status, 200);

        const reschedule = await client.patch(`/client/bookings/${reference}/reschedule`, { date: dayKey(15), startTime: 15 * 60, duration: 1 });
        assert.equal(reschedule.status, 400);
        assert.equal((await client.patch(`/client/bookings/${reference}/cancel`, {})).status, 200);
        assert.equal((await client.patch(`/client/bookings/${reference}/cancel`, {})).status, 400, "already cancelled");
    });

    test("a cancelled booking frees its slot", async () => {
        const table = await newTable();
        const first = await t.createClient();
        const second = await t.createClient();
        const { reference } = (await book(first.client, { tableId: table.id, date: dayKey(16) })).body.booking;
        assert.equal((await book(second.client, { tableId: table.id, date: dayKey(16) })).status, 409);
        await first.client.patch(`/client/bookings/${reference}/cancel`, {});
        assert.equal((await book(second.client, { tableId: table.id, date: dayKey(16) })).status, 201);
    });
});

describe("waitlist", () => {
    test("a client can wait for a taken slot, but not a free one, and can leave", async () => {
        const table = await newTable();
        const owner = await t.createClient();
        const { client } = await t.createClient();
        const slot = { tableId: table.id, date: dayKey(17), startTime: 18 * 60, duration: 1 };

        const free = await client.post("/client/waitlist", slot);
        assert.equal(free.status, 409);
        assert.match(free.body.message, /free/);

        await book(owner.client, slot);
        const join = await client.post("/client/waitlist", slot);
        assert.equal(join.status, 201, JSON.stringify(join.body));
        assert.equal((await client.post("/client/waitlist", slot)).status, 409, "no duplicates");
        assert.equal((await client.get("/client/waitlist")).body.waitlist.length, 1);

        assert.equal((await client.patch(`/client/waitlist/${join.body.entry.id}/cancel`, {})).status, 200);
    });

    test("a client can wait for at most 5 slots at a time", async () => {
        const table = await newTable();
        const owner = await t.createClient();
        const { client } = await t.createClient();
        for (let i = 0; i < 6; i += 1) {
            const slot = { tableId: table.id, date: dayKey(18), startTime: (13 + i) * 60, duration: 1 };
            await book(owner.client, slot);
            const join = await client.post("/client/waitlist", slot);
            assert.equal(join.status, i < 5 ? 201 : 400, `entry ${i + 1}`);
        }
    });
});
describe("club time zone", () => {
    test("slots are checked on Pakistan time: at 4:00 PM a 3:00 PM slot has started", async () => {
        const table = await newTable();
        // freeze the clock at 4:00 PM in Karachi (11:00 UTC); the old UTC check would have allowed 3:00 PM
        mock.timers.enable({ apis: ["Date"], now: new Date("2030-01-10T11:00:00.000Z") });
        try {
            const { client } = await t.createClient(); // signs in under the frozen clock
            const started = await book(client, { tableId: table.id, date: "2030-01-10", startTime: 15 * 60 });
            assert.equal(started.status, 400);
            assert.match(started.body.message, /already started/);
            assert.equal((await book(client, { tableId: table.id, date: "2030-01-10", startTime: 17 * 60 })).status, 201);
        } finally {
            mock.timers.reset();
        }
    });
});
