import nodemailer from 'nodemailer';
import dotenv from 'dotenv';
dotenv.config();

import { emailEnv } from '@repo/env/email';

export const sendMail = async (from: string, to: string, subject: string) => {
  const transporter = nodemailer.createTransport({
    host: 'smtp.ethereal.email',
    port: 587,
    auth: {
      user: emailEnv.EMAIL_FROM,
      pass: emailEnv.EMAIL_PASSWORD,
    },
  });
  const mailOptions = {
    from: from,
    to: to,
    subject: subject,
  };

  transporter.sendMail(mailOptions, (error, info) => {
    if (error) {
      console.log(error);
    } else {
      console.log('Email sent: ' + info.response);
    }
  });
};
