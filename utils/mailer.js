import nodemailer from "nodemailer";

let transporter;

export const isMailConfigured = () => Boolean(process.env.SMTP_HOST && process.env.SMTP_USER && process.env.SMTP_PASS);

/** Best-effort email. Returns true when sent; never throws. */
export async function sendMail({ to, subject, html, text }) {
  if (!isMailConfigured()) {
    console.log(`[mail] SMTP not configured – skipped "${subject}" to ${to}`);
    return false;
  }
  try {
    transporter ??= nodemailer.createTransport({
      host: process.env.SMTP_HOST,
      port: Number(process.env.SMTP_PORT) || 587,
      secure: process.env.SMTP_SECURE === "true",
      auth: { user: process.env.SMTP_USER, pass: process.env.SMTP_PASS },
    });
    await transporter.sendMail({ from: process.env.MAIL_FROM || process.env.SMTP_USER, to, subject, html, text });
    return true;
  } catch (err) {
    console.warn(`[mail] could not send "${subject}":`, err.message);
    return false;
  }
}
