const express = require('express');
const rateLimit = require('express-rate-limit');
const AWS = require('aws-sdk');
const cors = require('cors');
require('dotenv').config();
const app = express();
app.use(cors()); // Allow all origins

// Define rate limiting middleware for OTP requests
const otpLimiter = rateLimit({
    windowMs: 60 * 1000, // 1 minute
    max: 3, // limit each IP to 3 requests per minute
    message: "Too many OTP requests from this IP, please try again later."
});

// Helper function to generate a 4-digit OTP
const generateOTP = () => Math.floor(1000 + Math.random() * 9000);

// Apply the rate limiting middleware to the OTP route
app.get('/otp', otpLimiter, (req, res) => {
    const randomOTP = generateOTP();
    const YOUR_MESSAGE = `Your verification code is ${randomOTP}`;

    const params = {
        Message: YOUR_MESSAGE,
        PhoneNumber: '+' + req.query.number,
        MessageAttributes: {
            'AWS.SNS.SMS.SenderID': {
                DataType: 'String',
                StringValue: req.query.subject
            },
            'AWS.SNS.SMS.SMSType': {
                DataType: 'String',
                StringValue: "Transactional"
            }
        }
    };

    new AWS.SNS({ apiVersion: '2010-03-31' })
        .publish(params)
        .promise()
        .then(data => {
            res.end(JSON.stringify({ MessageID: data.MessageId, OTP: randomOTP }));
        })
        .catch(err => {
            res.end(JSON.stringify({ Error: err }));
        });
});

app.listen(3000, () => console.log('SMS Service Listening on PORT 3000'));