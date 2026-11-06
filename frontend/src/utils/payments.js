import api from "../services/api";

// keep in sync with backend/src/utils/payments.js
export const TRANSACTION_ID = /^[A-Za-z0-9-]{4,40}$/;

// keep in sync with backend/src/middleware/upload.js
export const PROOF_TYPES = ["image/jpeg", "image/png", "image/webp"];
export const MAX_PROOF_SIZE = 5 * 1024 * 1024;

export const paymentMethodLabels = { jazzcash: "JazzCash", easypaisa: "Easypaisa", bank: "Bank transfer" };

// posts fields plus the proof image as multipart form data
export const postWithProof = async (url, fields, paymentProof) => {
    const form = new FormData();
    Object.entries(fields).forEach(([key, value]) => form.append(key, value));
    form.append("paymentProof", paymentProof);
    // the multipart header stops axios from converting the form to JSON; the browser adds the boundary
    const { data } = await api.post(url, form, { headers: { "Content-Type": "multipart/form-data" } });
    return data;
};

// resolves to an object URL for a proof image; revoke it when done
export const fetchProofUrl = async (url) => {
    const { data } = await api.get(url, { responseType: "blob" });
    return URL.createObjectURL(data);
};
