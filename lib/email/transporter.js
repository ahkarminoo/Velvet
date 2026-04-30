import nodemailer from 'nodemailer';

const hasEmailCredentials = Boolean(process.env.EMAIL_USER && process.env.EMAIL_PASS);

// Create reusable transporter object using Namecheap SMTP
const transporter = nodemailer.createTransport({
  host: 'mail.privateemail.com', // Namecheap's SMTP server
  port: 587, // Use port 587 for TLS
  secure: false, // true for 465, false for other ports
  auth: hasEmailCredentials
    ? {
        user: process.env.EMAIL_USER,
        pass: process.env.EMAIL_PASS // Your email password (not app password)
      }
    : undefined,
  tls: {
    rejectUnauthorized: false // Allow self-signed certificates
  }
});

// Verify connection configuration
if (hasEmailCredentials) {
  transporter.verify((error) => {
    if (error) {
      console.error('Email transporter verification failed:', error);
    } else {
      console.log('Email transporter is ready to send messages');
    }
  });
} else {
  console.log('Email transporter verification skipped: missing EMAIL_USER/EMAIL_PASS');
}

export default transporter;
