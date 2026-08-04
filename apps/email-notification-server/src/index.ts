import { createClient } from "redis";
import dotenv from "dotenv";
import { sendMail } from "./email";
dotenv.config();

// Validate up front rather than discovering a missing EMAIL_FROM as an
// `undefined as string` cast at the first message.
import { emailEnv } from "@repo/env/email";

type EmailData = {
  email: string;
  subject: string;
  type: string; //winner,finishOwner, outbid
  username: string;
  auctionTitle: string;
  outbidAmount?: string;
  outbidUsername?: string;
};
const emailFrom = emailEnv.EMAIL_FROM;
const client = createClient({
  password: emailEnv.REDIS_PASSWORD,
  socket: {
    host: emailEnv.REDIS_HOST,
    // The port was hardcoded to 17801, so REDIS_PORT was documented in
    // .env.example but ignored.
    port: emailEnv.REDIS_PORT,
  },
});

client.on("error", (err) => console.log("Redis Client Connection Error", err));

async function startWorker() {
  try {
    await client.connect();
    console.log("Worker connected to Redis.");

    while (true) {
      try {
        const data = await client.brPop("emails", 0);
        if (data?.element) {
          const emailData = JSON.parse(data?.element) as EmailData;
          let sendData: string;
          switch (emailData.type) {
            case "winner":
              sendData = `Congrats ${emailData.username}! You won the auction ${emailData.auctionTitle} with a bid of ${emailData.outbidAmount}`;
              await sendMail(emailFrom, emailData.email, sendData);
              break;
            case "finishOwner":
              sendData = `Your auction ${emailData.auctionTitle} has finished`;
              await sendMail(emailFrom, emailData.email, sendData);
              break;
            case "outbid":
              sendData = `${emailData.username} outbid ${emailData.outbidUsername} for the auction ${emailData.auctionTitle} with a bid of ${emailData.outbidAmount}`;
              await sendMail(emailFrom, emailData.email, sendData);
              break;
            default:
              console.log("Unknown email type");
              break;
          }
        }
      } catch (error) {
        console.error("Error processing submission:", error);
      }
    }
  } catch (error) {
    console.error("Failed to connect to Redis", error);
  }
}

startWorker();
