const express = require("express");
const rateLimit = require("express-rate-limit");
const nodemailer = require("nodemailer");
const bodyParser = require("body-parser");
const AWS = require("aws-sdk");
const cors = require("cors");
require("dotenv").config();
const app = express();
app.use(cors()); // Allow all origins
app.use(express.json()); // Parse JSON bodies (as sent by API clients)

// Define rate limiting middleware for OTP requests
const otpLimiter = rateLimit({
  windowMs: 60 * 1000, // 1 minute
  max: 3, // limit each IP to 3 requests per minute
  message: "Too many OTP requests from this IP, please try again later.",
});

// Helper function to generate a 4-digit OTP
const generateOTP = () => Math.floor(1000 + Math.random() * 9000);
const transporter = nodemailer.createTransport({
    host: process.env.SMTP_HOST,
    port: process.env.SMTP_PORT,
    secure: false, // true for 465, false for other ports
    auth: {
      user: process.env.SMTP_USER,
      pass: process.env.SMTP_PASS,
    },
  });

// Apply the rate limiting middleware to the OTP route
app.get("/otp", otpLimiter, (req, res) => {
  const randomOTP = generateOTP();
  const YOUR_MESSAGE = `Your verification code is ${randomOTP}`;

  const params = {
    Message: YOUR_MESSAGE,
    PhoneNumber: "+" + req.query.number,
    MessageAttributes: {
      "AWS.SNS.SMS.SenderID": {
        DataType: "String",
        StringValue: req.query.subject,
      },
      "AWS.SNS.SMS.SMSType": {
        DataType: "String",
        StringValue: "Transactional",
      },
    },
  };

  new AWS.SNS({ apiVersion: "2010-03-31" })
    .publish(params)
    .promise()
    .then((data) => {
      res.end(JSON.stringify({ MessageID: data.MessageId, OTP: randomOTP }));
    })
    .catch((err) => {
      res.end(JSON.stringify({ Error: err }));
    });
});


app.post("/email", (req, res) => {
  const mailOptions = {
    from: process.env.SMTP_USER,
    to: req.body.to,
    subject: req.body.subject,
    text: req.body.text,
  };

  transporter.sendMail(mailOptions, (error, info) => {
    if (error) {
      return res.status(500).send(error.toString());
    }
    res.status(200).send("Email sent: " + info.response);
  });
});

app.listen(3000, () =>
  console.log("Email and SMS Service Listening on PORT 3000")
);
