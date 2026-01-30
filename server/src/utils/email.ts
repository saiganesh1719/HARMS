import nodemailer from 'nodemailer';

// This is a utility function to send emails.
// It is configured to use your email provider's details via environment variables.
const sendEmail = async (to: string, subject: string, text: string) => {
  // Check if email credentials are provided in environment variables
  if (!process.env.EMAIL_USER || !process.env.EMAIL_PASS) {
    console.warn('****************************************************************');
    console.warn('*** WARNING: EMAIL_USER or EMAIL_PASS not set in environment. ***');
    console.warn('*** Email sending is disabled. Please set these variables.   ***');
    console.warn('****************************************************************');
    return; // Silently fail if not configured
  }

  try {
    // Create a transporter object using Gmail SMTP transport
    const transporter = nodemailer.createTransport({
      service: 'gmail',
      auth: {
        user: process.env.EMAIL_USER, // Your Gmail address
        pass: process.env.EMAIL_PASS, // Your App Password
      },
    });

    // Send mail with defined transport object
    const info = await transporter.sendMail({
      from: `"HARMS" <${process.env.EMAIL_USER}>`, // sender address
      to: to, // list of receivers
      subject: subject, // Subject line
      text: text, // plain text body
    });

    console.log('Message sent: %s', info.messageId);
  } catch (error) {
    console.error('Error sending email:', error);
  }
};

export default sendEmail;
