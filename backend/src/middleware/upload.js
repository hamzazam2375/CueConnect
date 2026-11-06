import crypto from "crypto";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import multer from "multer";

const backendRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../..");
export const PAYMENT_PROOF_DIR = path.join(backendRoot, "uploads", "payment-proofs");

const MAX_PROOF_SIZE = 5 * 1024 * 1024;
const PROOF_TYPES = {
    "image/jpeg": ".jpg",
    "image/png": ".png",
    "image/webp": ".webp"
};

fs.mkdirSync(PAYMENT_PROOF_DIR, { recursive: true });

const proofUpload = multer({
    storage: multer.diskStorage({
        destination: PAYMENT_PROOF_DIR,
        filename: (req, file, cb) => cb(null, `${Date.now()}-${crypto.randomBytes(8).toString("hex")}${PROOF_TYPES[file.mimetype]}`)
    }),
    limits: { fileSize: MAX_PROOF_SIZE, files: 1 },
    fileFilter: (req, file, cb) => {
        if (PROOF_TYPES[file.mimetype]) return cb(null, true);
        cb(new multer.MulterError("LIMIT_UNEXPECTED_FILE", file.fieldname));
    }
}).single("paymentProof");

// accepts one payment proof image as `paymentProof` and turns upload errors into 400 responses
export const uploadPaymentProof = (req, res, next) => {
    proofUpload(req, res, (error) => {
        if (!error) return next();

        if (error.code === "LIMIT_FILE_SIZE") {
            return res.status(400).json({ message: "Payment proof must be 5 MB or smaller" });
        }
        if (error instanceof multer.MulterError) {
            return res.status(400).json({ message: "Payment proof must be a JPG, PNG, or WEBP image" });
        }

        console.error("Payment proof upload error:", error.message);
        res.status(500).json({ message: "Payment proof could not be uploaded" });
    });
};

// removes an uploaded proof when the request that carried it is rejected
export const discardUpload = (file) => {
    if (file?.path) fs.promises.unlink(file.path).catch(() => {});
};
