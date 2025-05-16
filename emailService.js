const nodemailer = require('nodemailer');
require("dotenv").config();

// Create transporter
// const transporter = nodemailer.createTransport({
//   service: 'gmail',
//   auth: {
//     user: process.env.EMAIL_USER,
//     pass: process.env.EMAIL_PASSWORD
//   }
// });



const transporter = nodemailer.createTransport({
  host: 'smtp.gmail.com',
  port: 587,
  secure: false, // true for 465, false for other ports
  auth: {
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_PASSWORD
  },
  tls: {
    // Necessary for Render's network
    rejectUnauthorized: false,
    minVersion: 'TLSv1.2'
  },
  // Important for Render
  connectionTimeout: 10000, // 10 seconds
  greetingTimeout: 10000,
  socketTimeout: 10000
});

//  verification
transporter.verify(function(error, success) {
  if (error) {
    console.error('SMTP Connection Test Failed:', {
      error: error.message,
      stack: error.stack,
      envUser: process.env.EMAIL_USER,
      envPassSet: !!process.env.EMAIL_PASSWORD
    });
  } else {
    console.log('SMTP Connection Verified');
  }
});








// Email templates
const emailTemplates = {
  quote: (data) => ({
    subject: `New Quote: ${data.name}`,
    html: `
      <h1>New Quote</h1>
      <p><strong>Name:</strong> ${data.name}</p>
      <p><strong>Phone:</strong> ${data.phone}</p>
      <p><strong>Email:</strong> ${data.email}</p>
      <p><strong>Price:</strong> ${data.price}</p>
      <p><strong>Height:</strong> ${data.height}</p>
      <p><strong>Material:</strong> ${data.material}</p>
      <p><strong>Finish:</strong> ${data.finish}</p>
    `
  }),
  enquiry: (data) => ({
    subject: `New Enquiry: ${data.service}`,
    html: `
      <h1>New Enquiry Received</h1>
      <p><strong>Name:</strong> ${data.name}</p>
      <p><strong>Phone:</strong> ${data.phone}</p>
      <p><strong>Email:</strong> ${data.email}</p>
      <p><strong>Service:</strong> ${data.service}</p>
      <p><strong>Message:</strong> ${data.message}</p>
    `
  })
};

// Send email function
async function sendEmail(type, data) {
  try {
    const template = emailTemplates[type](data);
    
    const mailOptions = {
      from: `"Shivam Kumar" <${process.env.EMAIL_USER}>`,
      to: 'careeranalytics499@gmail.com',
      subject: template.subject,
      html: template.html
    };

    const info = await transporter.sendMail(mailOptions);
    console.log('Email sent:', info.messageId);
    return true;
  } catch (error) {
    console.error('Error sending email:', error);
    throw error;
  }
}

module.exports = { sendEmail };