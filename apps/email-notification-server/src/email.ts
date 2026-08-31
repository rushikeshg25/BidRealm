import nodemailer from 'nodemailer';
import dotenv from 'dotenv';

dotenv.config();

const EMAIL_FROM = process.env.EMAIL_FROM;

// Hoisted: this used to be rebuilt for every message, so each notification paid
// for a fresh SMTP connection.
const transporter = nodemailer.createTransport({
  host: process.env.SMTP_HOST ?? 'smtp.ethereal.email',
  port: Number(process.env.SMTP_PORT ?? 587),
  auth: {
    user: process.env.EMAIL_FROM,
    pass: process.env.EMAIL_PASSWORD,
  },
});

export type Mail = {
  to: string;
  subject: string;
  text: string;
};

/**
 * The previous signature was (from, to, subject) but every call site passed
 * (from, body, address) -- so the message body was used as the recipient and
 * the recipient's address as the subject, and mailOptions carried no body at
 * all. A named argument makes that class of mistake impossible.
 *
 * Uses the promise API: the callback form resolved the await before the send
 * completed, so failures escaped the caller's try/catch.
 */
export const sendMail = async ({ to, subject, text }: Mail): Promise<void> => {
  await transporter.sendMail({ from: EMAIL_FROM, to, subject, text });
};
