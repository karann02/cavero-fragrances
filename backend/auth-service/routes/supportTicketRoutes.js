const express = require('express');
const router = express.Router();
const SupportTicket = require('../models/support_ticket');
const nodemailer = require('nodemailer');
const { verifyToken, verifySuperuser } = require('../middleware/auth');

function getMailConfig() {
  const emailUser = (process.env.EMAIL_USER || '').trim();
  const emailPass = (process.env.EMAIL_PASS || '').replace(/\s+/g, '');
  const contactReceiverEmail = (process.env.CONTACT_RECEIVER_EMAIL || emailUser).trim();

  if (!emailUser || !emailPass || !contactReceiverEmail) {
    throw new Error('Missing email configuration: EMAIL_USER, EMAIL_PASS, CONTACT_RECEIVER_EMAIL');
  }

  return { emailUser, emailPass, contactReceiverEmail };
}

async function sendSupportTicketNotification(ticketData) {
  const { emailUser, emailPass, contactReceiverEmail } = getMailConfig();

  const escapeHtml = (value = '') =>
    String(value)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#39;');

  const safeName = escapeHtml(ticketData.name);
  const safeMobile = escapeHtml(ticketData.mobile);
  const safeEmail = escapeHtml(ticketData.email);
  const safeSubject = escapeHtml(ticketData.subject);
  const safeMessage = escapeHtml(ticketData.message);

  const transporter = nodemailer.createTransport({
    service: 'gmail',
    auth: {
      user: emailUser,
      pass: emailPass
    }
  });

  const submittedAt = new Date().toLocaleString('en-IN', { timeZone: 'Asia/Kolkata' });

  await transporter.sendMail({
    from: `"Cavero Fragrances Contact" <${emailUser}>`,
    to: contactReceiverEmail,
    replyTo: ticketData.email,
    subject: `New Contact Query: ${ticketData.subject}`,
    text: [
      'New contact query received from website.',
      '',
      `Name: ${ticketData.name}`,
      `Mobile: ${ticketData.mobile}`,
      `Email: ${ticketData.email}`,
      `Subject: ${ticketData.subject}`,
      `Message: ${ticketData.message}`,
      `Submitted At: ${submittedAt}`
    ].join('\n'),
    html: `
      <div style="font-family:Arial,sans-serif;max-width:640px;margin:auto;padding:24px;border:1px solid #e5e7eb;border-radius:10px;">
        <h2 style="margin:0 0 16px;color:#111827;">New Contact Query</h2>
        <p style="margin:0 0 14px;color:#374151;">A new query was submitted on the Contact Us page.</p>
        <table style="width:100%;border-collapse:collapse;">
          <tr><td style="padding:8px 0;color:#6b7280;width:140px;">Name</td><td style="padding:8px 0;color:#111827;"><strong>${safeName}</strong></td></tr>
          <tr><td style="padding:8px 0;color:#6b7280;">Mobile</td><td style="padding:8px 0;color:#111827;">${safeMobile}</td></tr>
          <tr><td style="padding:8px 0;color:#6b7280;">Email</td><td style="padding:8px 0;color:#111827;">${safeEmail}</td></tr>
          <tr><td style="padding:8px 0;color:#6b7280;">Subject</td><td style="padding:8px 0;color:#111827;">${safeSubject}</td></tr>
          <tr><td style="padding:8px 0;color:#6b7280;vertical-align:top;">Message</td><td style="padding:8px 0;color:#111827;white-space:pre-wrap;">${safeMessage}</td></tr>
          <tr><td style="padding:8px 0;color:#6b7280;">Submitted</td><td style="padding:8px 0;color:#111827;">${submittedAt}</td></tr>
        </table>
      </div>
    `
  });
}

// Create a new support ticket (public)
router.post('/', async (req, res) => {
  try {
    const { name, mobile, email, subject, message } = req.body;
    if (!name || !mobile || !email || !subject || !message) {
      return res.status(400).json({ success: false, message: 'All fields are required' });
    }

    // Save the ticket FIRST so submission never depends on email delivery.
    const ticket = await SupportTicket.create({ name, mobile, email, subject, message });

    // Email notification is best-effort only — never block/fail the request on it.
    sendSupportTicketNotification({ name, mobile, email, subject, message })
      .catch((mailErr) => console.error('support ticket email failed (non-blocking):', mailErr?.message || mailErr));

    res.status(201).json({ success: true, data: ticket });
  } catch (err) {
    console.error('support ticket create error:', err);
    res.status(500).json({ success: false, message: 'Unable to submit query right now. Please try again.' });
  }
});

// Get all support tickets (admin)
router.get('/', verifyToken, verifySuperuser, async (req, res) => {
  try {
    const tickets = await SupportTicket.findAll({ order: [['createdAt', 'DESC']] });
    res.json({ success: true, data: tickets });
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

// Update ticket status (admin)
router.put('/:id/status', verifyToken, verifySuperuser, async (req, res) => {
  try {
    const { status } = req.body;
    const ticket = await SupportTicket.findByPk(req.params.id);
    if (!ticket) return res.status(404).json({ success: false, message: 'Ticket not found' });
    await ticket.update({ status });
    res.json({ success: true, data: ticket });
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

// Get tickets for the logged-in customer (filtered by email in token)
router.get('/user', verifyToken, async (req, res) => {
  try {
    const email = req.user?.email;
    if (!email) return res.status(400).json({ success: false, message: 'Email not found in token' });

    const tickets = await SupportTicket.findAll({
      where: { email },
      order: [['createdAt', 'DESC']]
    });
    res.json({ success: true, data: tickets });
  } catch (err) {
    console.error('support ticket user fetch error:', err);
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

module.exports = router;
