import { after, before, describe, test } from "node:test";
import assert from "node:assert/strict";
import { startTestServer } from "./helpers.js";

let t, club;
before(async () => {
    t = await startTestServer();
    club = await t.createBranch();
});
after(async () => { await t.stop(); });

// plays one frame (frame rate 400) for the client, who also pays; resolves to their open bill
const playFrame = async (userId) => {
    const table = await t.createTable(club.admin, { frameRate: 400 });
    const started = await club.admin.post("/admin/games", { tableId: table.id, type: "frame", frameType: "single", playerUserId: userId });
    assert.equal(started.status, 201, JSON.stringify(started.body));
    const stopped = await club.admin.patch(`/admin/games/${started.body.game.id}/stop`, { payerUserId: userId });
    assert.equal(stopped.status, 200, JSON.stringify(stopped.body));
    const bills = (await club.admin.get("/admin/bills")).body.bills;
    return bills.find((bill) => bill.payerUser?.id === userId && bill.status !== "paid");
};
const points = async (client) => (await client.get("/client/loyalty")).body;

describe("earning points", () => {
    test("a completed game earns 10 points and a notification", async () => {
        const { client, userId } = await t.createClient();
        await playFrame(userId);
        const loyalty = await points(client);
        assert.equal(loyalty.points, 10);
        assert.equal(loyalty.history[0].type, "earned");

        const notifications = (await client.get("/client/notifications")).body.notifications;
        assert.ok(notifications.some((item) => /10 loyalty points/.test(item.title)));
    });

    test("paying a bill earns 1 point per PKR 10 paid", async () => {
        const { client, userId } = await t.createClient();
        const bill = await playFrame(userId);
        assert.equal(bill.originalAmount, 400);

        const paid = await club.admin.post(`/admin/bills/${bill.id}/payments`, { amount: 250, method: "cash" });
        assert.equal(paid.status, 201, JSON.stringify(paid.body));
        assert.equal(paid.body.bill.status, "partial");
        assert.equal((await points(client)).points, 10 + 25);

        const overpay = await club.admin.post(`/admin/bills/${bill.id}/payments`, { amount: 500, method: "cash" });
        assert.equal(overpay.status, 400, "overpayments are rejected");
    });

    test("the loyalty page reports every rule", async () => {
        const { client } = await t.createClient();
        const { rules } = await points(client);
        assert.deepEqual(rules, { pointsPerGame: 10, pkrPerPoint: 10, pointValue: 1, maxRedeemRate: 0.2, billThreshold: 200 });
    });
});

describe("spending points on a bill", () => {
    test("needs more than 200 points", async () => {
        const { userId } = await t.createClient();
        const { default: Loyalty } = await import("../src/models/loyalty.js");
        const bill = await playFrame(userId); // +10 points
        await Loyalty.updateOne({ user: userId }, { $set: { points: 200 } });

        const refused = await club.admin.post(`/admin/bills/${bill.id}/loyalty-reward`, {});
        assert.equal(refused.status, 400);
        assert.match(refused.body.message, /More than 200/);
    });

    test("uses only the points the bill needs, once per bill", async () => {
        const { client, userId } = await t.createClient();
        const { default: Loyalty } = await import("../src/models/loyalty.js");
        const bill = await playFrame(userId);
        await Loyalty.updateOne({ user: userId }, { $set: { points: 1000 } });

        const redeemed = await club.admin.post(`/admin/bills/${bill.id}/loyalty-reward`, {});
        assert.equal(redeemed.status, 200, JSON.stringify(redeemed.body));
        assert.equal(redeemed.body.bill.loyaltyDiscount, 400);
        assert.equal(redeemed.body.bill.status, "paid");
        assert.equal((await points(client)).points, 600);

        assert.equal((await club.admin.post(`/admin/bills/${bill.id}/loyalty-reward`, {})).status, 400, "only once per bill");
    });
});
