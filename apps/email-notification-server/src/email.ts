import nodemailer from 'nodemailer';

export type Mail = {
  to: string;
  subject: string;
  text: string;
};

export type MailerConfig = {
  SMTP_HOST: string;
  SMTP_PORT: number;
  EMAIL_FROM: string;
  EMAIL_PASSWORD: string;
};

/**
 * Takes its configuration rather than reading process.env at import time, so
 * the worker can validate the environment before a transporter is built.
 *
 * The transporter is created once here; it used to be rebuilt for every
 * message, paying for a fresh SMTP connection per notification.
 */
export const createMailer = (config: MailerConfig) => {
  const transporter = nodemailer.createTransport({
    host: config.SMTP_HOST,
    port: config.SMTP_PORT,
    auth: { user: config.EMAIL_FROM, pass: config.EMAIL_PASSWORD },
  });

  /**
   * The previous signature was (from, to, subject) but every call site passed
   * (from, body, address) -- so the body became the recipient and the address
   * became the subject, and mailOptions carried no body at all. Named arguments
   * make that class of mistake impossible.
   *
   * Uses the promise API: the callback form resolved the caller's await before
   * the send completed, so failures escaped their try/catch.
   */
  return async ({ to, subject, text }: Mail): Promise<void> => {
    await transporter.sendMail({ from: config.EMAIL_FROM, to, subject, text });
  };
};
