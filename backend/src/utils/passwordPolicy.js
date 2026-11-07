// rules every client password must meet; keep in sync with frontend/src/utils/passwordPolicy.js
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
