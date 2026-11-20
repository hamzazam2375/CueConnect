import { after, before, describe, test } from "node:test";
import assert from "node:assert/strict";
import { startTestServer } from "./helpers.js";

let t;
before(async () => { t = await startTestServer(); });
after(async () => { await t.stop(); });

describe("client sign up and email verification", () => {
    test("sign up emails a code, and the code verifies the email and signs the client in", async () => {
        const browser = t.session();
        const signup = await browser.post("/auth/client/register", { firstName: "Sara", lastName: "Khan", email: " Sara@Example.com ", password: "Strong!Pass1" });
        assert.equal(signup.status, 201);
        assert.equal(signup.body.needsVerification, true);
        assert.equal(signup.body.email, "sara@example.com");

        const code = t.lastCode("sara@example.com");
        assert.match(code, /^\d{6}$/);

        const verify = await browser.post("/auth/client/verify-email", { email: "sara@example.com", code });
        assert.equal(verify.status, 200);
        assert.equal(verify.body.user.email, "sara@example.com");
        assert.equal((await browser.get("/auth/me")).status, 200);
    });

    test("weak passwords and duplicate emails are rejected", async () => {
        const browser = t.session();
        const weak = await browser.post("/auth/client/register", { firstName: "A", lastName: "B", email: "weak@example.com", password: "alllowercase" });
        assert.equal(weak.status, 400);
        assert.match(weak.body.message, /capital letter/);

        await t.createClient({ email: "taken@example.com" });
        const taken = await browser.post("/auth/client/register", { firstName: "A", lastName: "B", email: "TAKEN@example.com", password: "Strong!Pass1" });
        assert.equal(taken.status, 409);
    });

    test("a wrong code counts down the tries", async () => {
        const browser = t.session();
        await browser.post("/auth/client/register", { firstName: "A", lastName: "B", email: "tries@example.com", password: "Strong!Pass1" });
        const code = t.lastCode("tries@example.com");
        const wrong = code === "000000" ? "111111" : "000000";
        const response = await browser.post("/auth/client/verify-email", { email: "tries@example.com", code: wrong });
        assert.equal(response.status, 400);
        assert.match(response.body.message, /4 attempts left/);
    });

    test("an unverified client can't sign in until they enter a code", async () => {
        const { email, password } = await t.createClient({ verified: false });
        const browser = t.session();
        const login = await browser.post("/auth/client/login", { email, password });
        assert.equal(login.status, 403);
        assert.equal(login.body.needsVerification, true);
        assert.equal((await browser.get("/auth/me")).status, 401);
    });
});

describe("client sign in", () => {
    test("right password signs in, wrong password doesn't", async () => {
        const { email, password } = await t.createClient();
        assert.equal((await t.session().post("/auth/client/login", { email, password: "Wrong!Pass1" })).status, 401);
        assert.equal((await t.session().post("/auth/client/login", { email: email.toUpperCase(), password })).status, 200);
    });

    test("a deactivated account can't sign in", async () => {
        const { user, email, password } = await t.createClient();
        await t.User.updateOne({ _id: user._id }, { isActive: false });
        assert.equal((await t.session().post("/auth/client/login", { email, password })).status, 403);
    });

    test("client pages need a client session", async () => {
        assert.equal((await t.session().get("/client/bookings")).status, 401);
        const { admin } = await t.createBranch();
        assert.equal((await admin.get("/client/bookings")).status, 403);
    });
});

describe("forgot password", () => {
    test("unknown emails get the same reply and no email", async () => {
        const before = t.emails.length;
        const response = await t.session().post("/auth/password/forgot", { email: "nobody@example.com" });
        assert.equal(response.status, 200);
        assert.equal(t.emails.length, before);
    });

    test("the emailed code resets the password and signs out older sessions", async () => {
        const { email, password, client: oldSession } = await t.createClient();
        await new Promise((resolve) => setTimeout(resolve, 1100)); // older session gets an earlier token time

        const browser = t.session();
        assert.equal((await browser.post("/auth/password/forgot", { email })).status, 200);
        const code = t.lastCode(email);
        assert.match(code, /^\d{6}$/);

        assert.equal((await browser.post("/auth/password/forgot", { email })).status, 429, "one code per minute");

        const weak = await browser.post("/auth/password/reset", { email, code, newPassword: "weak" });
        assert.equal(weak.status, 400);

        const reset = await browser.post("/auth/password/reset", { email, code, newPassword: "Brand!New9" });
        assert.equal(reset.status, 200);

        assert.equal((await browser.post("/auth/password/reset", { email, code, newPassword: "Other!Pass3" })).status, 400, "codes are single use");
        assert.equal((await oldSession.get("/auth/me")).status, 401, "older sessions are signed out");
        assert.equal((await t.session().post("/auth/client/login", { email, password })).status, 401);
        assert.equal((await t.session().post("/auth/client/login", { email, password: "Brand!New9" })).status, 200);
    });

    test("five wrong codes lock the reset", async () => {
        const { email } = await t.createClient();
        const browser = t.session();
        await browser.post("/auth/password/forgot", { email });
        const code = t.lastCode(email);
        const wrong = code === "000000" ? "111111" : "000000";
        for (let i = 0; i < 5; i += 1) await browser.post("/auth/password/reset", { email, code: wrong, newPassword: "Brand!New9" });
        assert.equal((await browser.post("/auth/password/reset", { email, code, newPassword: "Brand!New9" })).status, 429);
    });

    test("resetting proves the email, so an unverified client can sign in after", async () => {
        const { email } = await t.createClient({ verified: false });
        const browser = t.session();
        await browser.post("/auth/password/forgot", { email });
        assert.equal((await browser.post("/auth/password/reset", { email, code: t.lastCode(email), newPassword: "Brand!New9" })).status, 200);
        assert.equal((await t.session().post("/auth/client/login", { email, password: "Brand!New9" })).status, 200);
    });

    test("admins reset with the stricter admin rules", async () => {
        const { branch } = await t.createBranch();
        const email = `admin-${branch.branchCode.toLowerCase()}@example.com`;
        const browser = t.session();
        assert.equal((await browser.post("/auth/password/forgot", { email, role: "client" })).status, 200);
        assert.equal(t.lastCode(email), null, "an admin email asked for as a client gets nothing");

        await browser.post("/auth/password/forgot", { email, role: "admin" });
        const code = t.lastCode(email);
        const noLowercase = await browser.post("/auth/password/reset", { email, role: "admin", code, newPassword: "NOLOWER!9" });
        assert.equal(noLowercase.status, 400);
        assert.equal((await browser.post("/auth/password/reset", { email, role: "admin", code, newPassword: "Admin!New9" })).status, 200);
        assert.equal((await t.session().post("/auth/admin/login", { email, password: "Admin!New9" })).status, 200);
    });
});
