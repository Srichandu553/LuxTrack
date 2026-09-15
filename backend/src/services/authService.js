import crypto from "node:crypto";

const TOKEN_TTL_SECONDS = 8 * 60 * 60;

const base64UrlEncode = (value) =>
    Buffer.from(value).toString("base64url");

const base64UrlDecode = (value) =>
    Buffer.from(value, "base64url").toString("utf8");

const getAuthSecret = () => {
    const secret = process.env.AUTH_SECRET;

    if (!secret || secret.length < 32) {
        throw new Error("AUTH_SECRET must be configured with at least 32 characters");
    }

    return secret;
};

export const hashPassword = (password) => {
    if (!password || password.length < 6) {
        throw new Error("Password must be at least 6 characters");
    }

    const salt = crypto.randomBytes(16).toString("hex");
    const hash = crypto.scryptSync(password, salt, 64).toString("hex");
    return `scrypt:${salt}:${hash}`;
};

export const verifyPassword = (password, storedHash) => {
    const [algorithm, salt, hash] = String(storedHash || "").split(":");

    if (algorithm !== "scrypt" || !salt || !hash || !password) {
        return false;
    }

    const candidate = crypto.scryptSync(password, salt, 64);
    const expected = Buffer.from(hash, "hex");

    return candidate.length === expected.length &&
        crypto.timingSafeEqual(candidate, expected);
};

export const createPasswordResetToken = () => {
    const token = crypto.randomBytes(32).toString("hex");
    const tokenHash = crypto
        .createHash("sha256")
        .update(token)
        .digest("hex");

    return {
        token,
        tokenHash,
        expiresAt: new Date(Date.now() + 15 * 60 * 1000)
    };
};

export const hashResetToken = (token) =>
    crypto.createHash("sha256").update(String(token)).digest("hex");

export const createOAuthState = () => {
    const payload = base64UrlEncode(JSON.stringify({
        nonce: crypto.randomBytes(16).toString("hex"),
        exp: Math.floor(Date.now() / 1000) + 10 * 60
    }));
    const signature = crypto
        .createHmac("sha256", getAuthSecret())
        .update(payload)
        .digest("base64url");

    return `${payload}.${signature}`;
};

export const verifyOAuthState = (state) => {
    const [payload, signature] = String(state || "").split(".");

    if (!payload || !signature) return false;

    const expected = crypto
        .createHmac("sha256", getAuthSecret())
        .update(payload)
        .digest("base64url");
    const receivedBuffer = Buffer.from(signature);
    const expectedBuffer = Buffer.from(expected);

    if (
        receivedBuffer.length !== expectedBuffer.length ||
        !crypto.timingSafeEqual(receivedBuffer, expectedBuffer)
    ) {
        return false;
    }

    const parsed = JSON.parse(base64UrlDecode(payload));
    return parsed.exp > Math.floor(Date.now() / 1000);
};

export const createAccessToken = ({ id, email, role }) => {
    const payload = {
        sub: Number(id),
        email,
        role,
        exp: Math.floor(Date.now() / 1000) + TOKEN_TTL_SECONDS
    };
    const encodedPayload = base64UrlEncode(JSON.stringify(payload));
    const signature = crypto
        .createHmac("sha256", getAuthSecret())
        .update(encodedPayload)
        .digest("base64url");

    return `${encodedPayload}.${signature}`;
};

export const verifyAccessToken = (token) => {
    const [encodedPayload, signature] = String(token || "").split(".");

    if (!encodedPayload || !signature) {
        return null;
    }

    const expectedSignature = crypto
        .createHmac("sha256", getAuthSecret())
        .update(encodedPayload)
        .digest("base64url");
    const received = Buffer.from(signature);
    const expected = Buffer.from(expectedSignature);

    if (
        received.length !== expected.length ||
        !crypto.timingSafeEqual(received, expected)
    ) {
        return null;
    }

    const payload = JSON.parse(base64UrlDecode(encodedPayload));

    if (!payload.exp || payload.exp <= Math.floor(Date.now() / 1000)) {
        return null;
    }

    return payload;
};
