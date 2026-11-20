// rules every client password must meet; keep in sync with backend/src/utils/passwordPolicy.js
export const PASSWORD_RULES = [
    { label: "At least 8 characters", test: (value) => value.length >= 8 },
    { label: "One capital letter", test: (value) => /[A-Z]/.test(value) },
    { label: "One special character", test: (value) => /[^A-Za-z0-9]/.test(value) }
];

// null when the password is fine, otherwise a message naming what is missing
export const passwordError = (password) => {
    const missing = PASSWORD_RULES.filter((rule) => !rule.test(String(password || ""))).map((rule) => rule.label.toLowerCase());
    return missing.length ? `Password must have ${missing.join(", ")}` : null;
};

// admins use a stricter policy; keep in sync with ADMIN_PASSWORD_RULES in backend/src/utils/passwordPolicy.js
export const ADMIN_PASSWORD_RULES = [
    { label: "At least 8 characters", test: (value) => value.length >= 8 },
    { label: "One uppercase letter", test: (value) => /[A-Z]/.test(value) },
    { label: "One lowercase letter", test: (value) => /[a-z]/.test(value) },
    { label: "One digit", test: (value) => /\d/.test(value) },
    { label: "One special character", test: (value) => /[^A-Za-z0-9]/.test(value) }
];
