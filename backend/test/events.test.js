import { after, before, describe, test } from "node:test";
import assert from "node:assert/strict";
import { PNG, startTestServer } from "./helpers.js";

let t, club;
before(async () => {
    t = await startTestServer();
    club = await t.createBranch();
});
after(async () => { await t.stop(); });

let eventNumber = 0;
const createEvent = async (overrides = {}) => {
    eventNumber += 1;
    const response = await club.admin.post("/admin/events", {
        title: `Test Event ${eventNumber}`,
        type: "tournament",
        date: new Date(Date.now() + 7 * 86400000).toISOString(),
        description: "Test",
        registrationFee: 0,
        ...overrides
    });
    assert.equal(response.status, 201, JSON.stringify(response.body));
    return response.body.event;
};

const paidForm = ({ transactionId = `EVT${Date.now()}${Math.floor(Math.random() * 1000)}`, proof = PNG } = {}) => {
    const form = new FormData();
    form.append("paymentAccountId", club.accountId);
    form.append("transactionId", transactionId);
    if (proof) form.append("paymentProof", new Blob([proof], { type: "image/png" }), "proof.png");
    return form;
};

const registrationId = async (eventId, reference) => (await club.admin.get(`/admin/events/${eventId}/registrations`)).body.registrations.find((item) => item.reference === reference).id;

describe("event registration", () => {
    test("free events confirm right away", async () => {
        const event = await createEvent();
        const { client } = await t.createClient();
        const response = await client.post(`/client/events/${event.id}/register`, new FormData());
        assert.equal(response.status, 201, JSON.stringify(response.body));
        assert.equal(response.body.registration.status, "confirmed");
        assert.equal((await client.post(`/client/events/${event.id}/register`, new FormData())).status, 409, "no double registration");
    });

    test("paid events need a screenshot and stay registered until the club confirms", async () => {
        const event = await createEvent({ registrationFee: 1500 });
        const { client } = await t.createClient();

        const noProof = await client.post(`/client/events/${event.id}/register`, paidForm({ proof: null }));
        assert.equal(noProof.status, 400);

        const response = await client.post(`/client/events/${event.id}/register`, paidForm());
        assert.equal(response.status, 201, JSON.stringify(response.body));
        const { reference } = response.body.registration;
        assert.equal(response.body.registration.status, "registered");
        assert.equal((await client.get(`/client/event-registrations/${reference}/payment-proof`)).status, 200);

        const confirm = await club.admin.patch(`/admin/event-registrations/${await registrationId(event.id, reference)}`, { status: "confirmed" });
        assert.equal(confirm.status, 200, JSON.stringify(confirm.body));
        const mine = (await client.get("/client/event-registrations")).body.registrations.find((item) => item.reference === reference);
        assert.equal(mine.status, "confirmed");
    });

    test("a full event takes no more registrations, and a cancellation frees a spot", async () => {
        const event = await createEvent({ maxParticipants: 1 });
        const first = await t.createClient();
        const second = await t.createClient();
        const { reference } = (await first.client.post(`/client/events/${event.id}/register`, new FormData())).body.registration;

        const full = await second.client.post(`/client/events/${event.id}/register`, new FormData());
        assert.equal(full.status, 409);
        assert.match(full.body.message, /full/);

        assert.equal((await first.client.patch(`/client/event-registrations/${reference}/cancel`, {})).status, 200);
        assert.equal((await second.client.post(`/client/events/${event.id}/register`, new FormData())).status, 201);
    });

    test("a client can register again after cancelling", async () => {
        const event = await createEvent();
        const { client } = await t.createClient();
        const { reference } = (await client.post(`/client/events/${event.id}/register`, new FormData())).body.registration;
        await client.patch(`/client/event-registrations/${reference}/cancel`, {});
        assert.equal((await client.patch(`/client/event-registrations/${reference}/cancel`, {})).status, 400, "already cancelled");
        assert.equal((await client.post(`/client/events/${event.id}/register`, new FormData())).status, 201);
    });

    test("cancelled events disappear for clients", async () => {
        const event = await createEvent();
        assert.equal((await club.admin.patch(`/admin/events/${event.id}/status`, { status: "cancelled" })).status, 200);
        const { client } = await t.createClient();
        // clients no longer see a cancelled event at all
        assert.equal((await client.post(`/client/events/${event.id}/register`, new FormData())).status, 404);
    });
});
