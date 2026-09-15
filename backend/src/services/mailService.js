import nodemailer from "nodemailer";

const getTransporter = () => {
    const required = [
        "SMTP_HOST",
        "SMTP_PORT",
        "SMTP_USER",
        "SMTP_PASSWORD"
    ];

    if (required.some((key) => !process.env[key])) {
        return null;
    }

    return nodemailer.createTransport({
        host: process.env.SMTP_HOST,
        port: Number(process.env.SMTP_PORT),
        secure: String(process.env.SMTP_SECURE).toLowerCase() === "true",
        auth: {
            user: process.env.SMTP_USER,
            pass: process.env.SMTP_PASSWORD
        }
    });
};

export const sendPasswordResetEmail = async ({ email, token }) => {
    const transporter = getTransporter();

    if (!transporter) {
        return false;
    }

    const frontendUrl = process.env.FRONTEND_URL || "http://localhost:5173";
    const resetUrl = `${frontendUrl}/?token=${encodeURIComponent(token)}`;

    await transporter.sendMail({
        from: process.env.MAIL_FROM || process.env.SMTP_USER,
        to: email,
        subject: "Reset your LuxTrack password",
        text: `Reset your LuxTrack password using this link: ${resetUrl}. This link expires in 15 minutes.`,
        html: `<p>Reset your LuxTrack password using the link below.</p><p><a href="${resetUrl}">Reset password</a></p><p>This link expires in 15 minutes.</p>`
    });

    return true;
};

export const sendPriceAlertEmail = async ({
    email, assetName, brand, model, previousPrice, currentPrice, targetPrice, currency
}) => {
    const transporter = getTransporter();
    if (!transporter) return false;

    const frontendUrl = process.env.FRONTEND_URL || "http://localhost:5173";
    const productUrl = `${frontendUrl}/assets/${encodeURIComponent(assetName)}`;
    const format = (value) => `${currency || "INR"} ${Number(value).toLocaleString()}`;
    await transporter.sendMail({
        from: process.env.MAIL_FROM || process.env.SMTP_USER,
        to: email,
        subject: `LuxTrack price alert: ${assetName}`,
        text: `${brand || ""} ${model || assetName} reached your target. Current price: ${format(currentPrice)}. Target: ${format(targetPrice)}. View: ${productUrl}`,
        html: `<div style="font-family:Arial,sans-serif;color:#152235"><h1 style="color:#3975c6">LUXTRACK</h1><h2>${assetName}</h2><p>Your price target has been reached.</p><p>Previous price: <strong>${format(previousPrice)}</strong><br>Current price: <strong>${format(currentPrice)}</strong><br>Target price: <strong>${format(targetPrice)}</strong></p><p><a href="${productUrl}">View asset</a></p></div>`
    });
    return true;
};
