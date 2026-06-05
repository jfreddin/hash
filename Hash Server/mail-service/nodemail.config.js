import nodemailer from "nodemailer";
import dotenv from "dotenv";
dotenv.config();

console.log("USER:", process.env.GMAIL);
console.log("PASS:", process.env.PASS ? "loaded" : "missing");

export const sender = {
  email: process.env.GMAIL,
  name: "John Doe",
}

export const nodeMailSender = nodemailer.createTransport({
  host: "smtp.gmail.com",
  port: 587,
  secure: false, // true for port 465, false for 587
  auth: {
    user: process.env.GMAIL,     // your full gmail address
    pass: process.env.PASS, // the 16-char app password
  },
});