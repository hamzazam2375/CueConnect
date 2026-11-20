import multer from "multer";
import { deleteProof, saveProof } from "../services/proofStorage.js";

const MAX_PROOF_SIZE = 5 * 1024 * 1024;
const PROOF_TYPES = {
    "image/jpeg": ".jpg",
    "image/png": ".png",
    "image/webp": ".webp"
};

// checks the file's first bytes, so a renamed non-image can't pass as one
const looksLikeImage = (buffer, mimetype) => {
    if (mimetype === "image/jpeg") return buffer[0] === 0xff && buffer[1] === 0xd8 && buffer[2] === 0xff;
    if (mimetype === "image/png") return buffer.subarray(0, 8).equals(Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]));
    if (mimetype === "image/webp") return buffer.subarray(0, 4).toString("ascii") === "RIFF" && buffer.subarray(8, 12).toString("ascii") === "WEBP";
    return false;
};

// held in memory, then handed to proof storage (Cloudinary in production, disk locally)
const proofUpload = multer({
    storage: multer.memoryStorage(),
    limits: { fileSize: MAX_PROOF_SIZE, files: 1 },
    fileFilter: (req, file, cb) => {
        if (PROOF_TYPES[file.mimetype]) return cb(null, true);
        cb(new multer.MulterError("LIMIT_UNEXPECTED_FILE", file.fieldname));
    }
}).single("paymentProof");

const invalidType = (res) => res.status(400).json({ message: "Payment proof must be a JPG, PNG, or WEBP image" });

// Accepts one payment proof image as `paymentProof`, stores it, and sets `req.file.filename`
// to its storage key. Upload errors become 400 responses.
export const uploadPaymentProof = (req, res, next) => {
    proofUpload(req, res, async (error) => {
        if (error) {
            if (error.code === "LIMIT_FILE_SIZE") {
                return res.status(400).json({ message: "Payment proof must be 5 MB or smaller" });
            }
            if (error instanceof multer.MulterError) return invalidType(res);

            console.error("Payment proof upload error:", error.message);
            return res.status(500).json({ message: "Payment proof could not be uploaded" });
        }

        if (!req.file) return next();
        if (!looksLikeImage(req.file.buffer, req.file.mimetype)) return invalidType(res);

        try {
            req.file.filename = await saveProof(req.file.buffer, PROOF_TYPES[req.file.mimetype]);
            req.file.buffer = null;
            next();
        } catch (saveError) {
            console.error("Payment proof storage error:", saveError.message);
            res.status(502).json({ message: "Payment proof could not be uploaded. Please try again" });
        }
    });
};

// removes an uploaded proof when the request that carried it is rejected
export const discardUpload = (file) => {
    if (file?.filename) deleteProof(file.filename);
};
