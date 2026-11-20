import crypto from "crypto";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import { v2 as cloudinary } from "cloudinary";

// Payment proof images live in Cloudinary when it is configured, otherwise on local disk.
// Render's disk is wiped on every deploy, so production must set the Cloudinary variables.
//
// The value saved on a booking/registration (`paymentProof`) is a storage key:
//   "cld:<public_id>.<format>"  → private ("authenticated") Cloudinary image
//   "<file name>"               → file in uploads/payment-proofs (local development, older records)

const backendRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../..");
// PROOF_UPLOAD_DIR lets the tests keep their files in a temporary folder
const localDir = () => process.env.PROOF_UPLOAD_DIR || path.join(backendRoot, "uploads", "payment-proofs");
const CLOUD_PREFIX = "cld:";
const CLOUD_FOLDER = "cueconnect/payment-proofs";

let configured = null;

// reads the env lazily so it works no matter when dotenv runs
const useCloudinary = () => {
    if (configured !== null) return configured;
    const { CLOUDINARY_URL, CLOUDINARY_CLOUD_NAME, CLOUDINARY_API_KEY, CLOUDINARY_API_SECRET } = process.env;
    if (CLOUDINARY_CLOUD_NAME && CLOUDINARY_API_KEY && CLOUDINARY_API_SECRET) {
        cloudinary.config({ cloud_name: CLOUDINARY_CLOUD_NAME, api_key: CLOUDINARY_API_KEY, api_secret: CLOUDINARY_API_SECRET, secure: true });
        configured = true;
    } else if (CLOUDINARY_URL) {
        // the SDK reads CLOUDINARY_URL from the environment by itself
        cloudinary.config({ secure: true });
        configured = true;
    } else {
        configured = false;
        if (process.env.NODE_ENV === "production") {
            console.warn("Cloudinary is not configured: payment proofs are saved to local disk and will be lost on redeploy");
        }
    }
    return configured;
};

const randomName = () => `${Date.now()}-${crypto.randomBytes(8).toString("hex")}`;

const uploadToCloudinary = (buffer) => new Promise((resolve, reject) => {
    const stream = cloudinary.uploader.upload_stream(
        { folder: CLOUD_FOLDER, public_id: randomName(), resource_type: "image", type: "authenticated", overwrite: false },
        (error, result) => (error ? reject(error) : resolve(result))
    );
    stream.end(buffer);
});

// Stores an image buffer and resolves to its storage key.
export const saveProof = async (buffer, extension) => {
    if (useCloudinary()) {
        const result = await uploadToCloudinary(buffer);
        return `${CLOUD_PREFIX}${result.public_id}.${result.format}`;
    }
    await fs.promises.mkdir(localDir(), { recursive: true });
    const fileName = `${randomName()}${extension}`;
    await fs.promises.writeFile(path.join(localDir(), fileName), buffer);
    return fileName;
};

const splitCloudKey = (key) => {
    const ref = key.slice(CLOUD_PREFIX.length);
    const dot = ref.lastIndexOf(".");
    return { publicId: ref.slice(0, dot), format: ref.slice(dot + 1) };
};

// Removes a stored proof; never throws (a leftover file is not worth failing a request over).
export const deleteProof = async (key) => {
    if (!key) return;
    try {
        if (key.startsWith(CLOUD_PREFIX)) {
            if (!useCloudinary()) return;
            const { publicId } = splitCloudKey(key);
            await cloudinary.uploader.destroy(publicId, { type: "authenticated", resource_type: "image", invalidate: true });
        } else {
            await fs.promises.unlink(path.join(localDir(), path.basename(key)));
        }
    } catch (error) {
        if (error.code !== "ENOENT") console.error("Payment proof delete error:", error.message);
    }
};

// Streams a stored proof to the response. Only signed-in owners/admins reach this, and the
// Cloudinary copy is private, so the image is proxied instead of handing out its URL.
export const sendProof = async (res, key) => {
    const notFound = () => {
        if (!res.headersSent) res.status(404).json({ message: "Payment proof not found" });
    };

    if (!key.startsWith(CLOUD_PREFIX)) {
        return res.sendFile(path.basename(key), { root: localDir(), headers: { "Cache-Control": "private, no-store" } }, (error) => {
            if (error) notFound();
        });
    }

    if (!useCloudinary()) return notFound();
    try {
        const { publicId, format } = splitCloudKey(key);
        const url = cloudinary.url(publicId, { type: "authenticated", resource_type: "image", format, sign_url: true, secure: true });
        const upstream = await fetch(url);
        if (!upstream.ok) return notFound();
        res.set({
            "Content-Type": upstream.headers.get("content-type") || "application/octet-stream",
            "Cache-Control": "private, no-store"
        });
        res.send(Buffer.from(await upstream.arrayBuffer()));
    } catch (error) {
        console.error("Payment proof fetch error:", error.message);
        notFound();
    }
};
