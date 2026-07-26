// THIS IS FROM RESEND (REQUIRE DOMAIN TO SEND MAILS TO USERS)
// const { Resend } = require("resend");

// const resend = new Resend(process.env.RESEND_API_KEY);

// exports.sendEmail = async ({ to, subject, html }) => {
//   await resend.emails.send({
//     from: process.env.EMAIL_FROM,
//     to,
//     subject,
//     html,
//   });
// };

// THIS IS NODEMAILER (WONT WORK IN PRODUCTION)
const nodemailer = require("nodemailer");

// Create a transporter using SMTP
const transporter = nodemailer.createTransport({
  host: process.env.MAILTRAP_HOST,
  port: process.env.MAILTRAP_PORT,
  secure: false, // use STARTTLS (upgrade connection to TLS after connecting)
  auth: {
    user: process.env.MAILTRAP_USER,
    pass: process.env.MAILTRAP_PASS,
  },
});

exports.sendEmail = async ({ to, subject, html, text }) => {
  await transporter.sendMail({
    from: process.env.EMAIL_FROM,
    to,
    subject,
    html,
    text,
  });
};
