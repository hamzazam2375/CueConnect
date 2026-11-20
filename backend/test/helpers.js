// Shared setup for the API tests: the real Express app on an in-memory MongoDB, with
// email (Resend) faked so codes can be read back, and helpers to seed data through the API.
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { MongoMemoryServer } from "mongodb-memory-server-core";

// a 1×1 PNG, used as a payment proof screenshot
export const PNG = Buffer.from("89504e470d0a1a0a0000000d49484452000000010000000108060000001f15c4890000000d4944415478da63f8ffff3f0005fe02fea7d1a0e10000000049454e44ae426082", "hex");

// YYYY-MM-DD, `days` from today (UTC, like the server)
export const dayKey = (days) => new Date(Date.now() + days * 86400000).toISOString().slice(0, 10);

export const startTestServer = async () => {
    const tempDir = fs.mkdtempSync(path.join(os.tmpdir(), "cueconnect-test-"));
    Object.assign(process.env, {
        NODE_ENV: "test",
        JWT_SECRET: "test-secret",
        CLIENT_URL: "http://localhost:5173",
        RESEND_API_KEY: "re_test",
        RESEND_FROM_EMAIL: "CueConnect <test@example.com>",
        ADMIN_SECRET_KEY: "test-admin-key",
        PROOF_UPLOAD_DIR: path.join(tempDir, "proofs"),
        CLOUDINARY_URL: "",
        CLOUDINARY_CLOUD_NAME: "",
        CLOUDINARY_API_KEY: "",
        CLOUDINARY_API_SECRET: ""
    });

    // Resend sends through fetch; keep the emails instead of sending them
    const emails = [];
    const realFetch = globalThis.fetch;
    globalThis.fetch = async (url, options) => {
        if (String(url).startsWith("https://api.resend.com")) {
            emails.push(JSON.parse(options.body));
            return new Response(JSON.stringify({ id: `email-${emails.length}` }), { status: 200, headers: { "content-type": "application/json" } });
        }
        return realFetch(url, options);
    };

    const dbPath = path.join(tempDir, "db");
    fs.mkdirSync(dbPath);
    const mongo = await MongoMemoryServer.create({ instance: { dbPath, storageEngine: "wiredTiger" } });
    const { default: mongoose } = await import("mongoose");
    await mongoose.connect(mongo.getUri("cueconnect-test"));

    const { default: app } = await import("../src/app.js");
    const server = await new Promise((resolve) => {
        const listening = app.listen(0, "127.0.0.1", () => resolve(listening));
    });
    const base = `http://127.0.0.1:${server.address().port}/api`;

    // one signed-in browser: keeps its own auth cookie between calls
    const session = () => {
        let cookie = "";
        const call = async (method, url, body) => {
            const isForm = body instanceof FormData;
            const response = await realFetch(base + url, {
                method,
                headers: { ...(isForm || body === undefined ? {} : { "content-type": "application/json" }), ...(cookie ? { cookie } : {}) },
                body: isForm ? body : body === undefined ? undefined : JSON.stringify(body)
            });
            const setCookie = response.headers.get("set-cookie");
            if (setCookie) cookie = setCookie.split(";")[0];
            const text = await response.text();
            let data = text;
            try { data = JSON.parse(text); } catch { /* not JSON, e.g. an image */ }
            return { status: response.status, body: data, headers: response.headers };
        };
        return {
            get: (url) => call("GET", url),
            post: (url, body) => call("POST", url, body),
            patch: (url, body) => call("PATCH", url, body),
            del: (url) => call("DELETE", url),
            get cookie() { return cookie; },
            set cookie(value) { cookie = value; }
        };
    };

    const { default: User } = await import("../src/models/user.js");
    const { default: Branch } = await import("../src/models/branch.js");
    const { default: bcrypt } = await import("bcrypt");
    let customerNumber = 0;

    // a branch with an admin, opening 12:00 PM–2:00 AM, and one JazzCash account clients pay into
    const createBranch = async ({ name = "Test Branch" } = {}) => {
        const branch = await Branch.create({ branchName: name, branchCode: await Branch.generateCode() });
        const email = `admin-${branch.branchCode.toLowerCase()}@example.com`;
        await User.create({ firstName: "Test", lastName: "Admin", email, password: await bcrypt.hash("Admin!Pass1", 10), role: "admin", branchId: branch._id });
        const admin = session();
        const login = await admin.post("/auth/admin/login", { email, password: "Admin!Pass1" });
        if (login.status !== 200) throw new Error(`admin login failed: ${JSON.stringify(login.body)}`);
        const accounts = await admin.post("/admin/settings/accounts", { method: "jazzcash", accountTitle: "Test Club", accountNumber: "03001234567" });
        const accountId = accounts.body.branch.paymentAccounts[0].id;
        return { branch, branchId: String(branch._id), admin, accountId };
    };

    const createTable = async (admin, overrides = {}) => {
        const response = await admin.post("/admin/tables", { name: `Table ${Math.random().toString(36).slice(2, 7)}`, tableType: "snooker", frameRate: 400, centuryRate: 10, ...overrides });
        if (response.status !== 201) throw new Error(`create table failed: ${JSON.stringify(response.body)}`);
        const table = response.body.table;
        return { ...table, id: String(table.id || table._id) };
    };

    // a verified client, already signed in
    const createClient = async ({ email, password = "Client!Pass1", verified = true } = {}) => {
        customerNumber += 1;
        const user = await User.create({
            firstName: "Test",
            lastName: `Client${customerNumber}`,
            email: email || `client${customerNumber}@example.com`,
            password: await bcrypt.hash(password, 10),
            role: "client",
            emailVerified: verified,
            customerCode: `TST-${String(customerNumber).padStart(4, "0")}`
        });
        const client = session();
        if (verified) {
            const login = await client.post("/auth/client/login", { email: user.email, password });
            if (login.status !== 200) throw new Error(`client login failed: ${JSON.stringify(login.body)}`);
        }
        return { user, userId: String(user._id), client, email: user.email, password };
    };

    let transactionNumber = 0;
    // multipart booking request, the way the booking review page sends it
    const bookingForm = ({ tableId, date, startTime = 18 * 60, duration = 1, accountId, transactionId, loyaltyPoints = 0, proof = PNG, proofType = "image/png" }) => {
        transactionNumber += 1;
        const form = new FormData();
        const fields = { tableId, date, startTime, duration, paymentAccountId: accountId, transactionId: transactionId ?? `TXN${Date.now()}${transactionNumber}`, loyaltyPoints };
        Object.entries(fields).forEach(([key, value]) => form.append(key, String(value)));
        if (proof) form.append("paymentProof", new Blob([proof], { type: proofType }), "proof.png");
        return form;
    };

    // last 6-digit code emailed to `to`
    const lastCode = (to) => {
        const email = emails.filter((item) => [].concat(item.to).includes(to)).at(-1);
        return email?.html.match(/letter-spacing:12px[^>]*>(\d{6})</)?.[1] ?? null;
    };

    const stop = async () => {
        await new Promise((resolve) => server.close(resolve));
        await mongoose.disconnect();
        await mongo.stop();
        globalThis.fetch = realFetch;
        fs.rmSync(tempDir, { recursive: true, force: true });
    };

    return { base, session, emails, lastCode, createBranch, createTable, createClient, bookingForm, User, stop };
};
