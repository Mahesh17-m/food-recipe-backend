const nodemailer = require('nodemailer');
const pug = require('pug');
const path = require('path');
const { convert } = require('html-to-text');

const transport = nodemailer.createTransport({
  host: process.env.EMAIL_HOST,
  port: process.env.EMAIL_PORT,
  auth: {
    user: process.env.EMAIL_USERNAME,
    pass: process.env.EMAIL_PASSWORD
  }
});

const sendEmail = async (to, subject, template, context) => {
  try {
    const html = pug.renderFile(
      path.join(__dirname, '..', 'views', 'emails', `${template}.pug`),
      context
    );

    const mailOptions = {
      from: `"Make The Taste" <${process.env.EMAIL_FROM}>`,
      to,
      subject,
      html,
      text: convert(html)
    };

    const info = await transport.sendMail(mailOptions);
    console.log('✅ Email sent:', info.messageId);
    return info;
  } catch (error) {
    console.error('❌ Email sending failed:', error);
    throw error;
  }
};

exports.sendWelcomeEmail = (email, name, token) => {
  const url = `${process.env.CLIENT_URL}/verify-email?token=${token}`;
  return sendEmail(
    email,
    'Welcome to Make The Taste! Please verify your email',
    'welcome',
    { name, url }
  );
};

exports.sendPasswordResetEmail = (email, resetURL, name) => {
  return sendEmail(
    email,
    'Password Reset Request - Make The Taste',
    'passwordReset',
    { name, resetURL, expiryTime: '10 minutes' }
  );
};

exports.sendPasswordResetConfirmation = (email, name) => {
  return sendEmail(
    email,
    'Password Changed Successfully - Make The Taste',
    'passwordResetConfirmation',
    { name, supportEmail: process.env.SUPPORT_EMAIL }
  );
};

exports.sendLoginNotification = (email, name, deviceInfo) => {
  return sendEmail(
    email,
    'New Login Detected - Make The Taste',
    'loginNotification',
    { name, deviceInfo, timestamp: new Date().toLocaleString() }
  );
};