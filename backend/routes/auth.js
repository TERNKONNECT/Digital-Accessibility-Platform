const express = require("express");
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const crypto = require("crypto");
const { User, Organization } = require("../models");
const { appUrl, verificationEmailTemplate, passwordResetEmailTemplate, sendEmail } = require("../config/email.js");

const router = express.Router();

const hashValue = (value) => crypto.createHash("sha256").update(value).digest("hex");
const normalizeEmail = (email) => email.toLowerCase().trim();
const tokenExpiry = (minutes) => new Date(Date.now() + minutes * 60 * 1000);

async function sendVerificationEmail(user) {
  const token = crypto.randomBytes(32).toString("hex");
  user.emailVerificationToken = hashValue(token);
  user.emailVerificationExpires = tokenExpiry(60 * 24);
  await user.save();

  const link = appUrl(`/verify-email?token=${token}&email=${encodeURIComponent(user.email)}`);
  const emailResult = await sendEmail({
    to: user.email,
    subject: "Verify your Ternkonnect account",
    html: verificationEmailTemplate({ name: user.name, link }),
  });

  if (emailResult?.skipped) {
    console.warn(`Verification link for ${user.email}: ${link}`);
  }

  return { link, skipped: Boolean(emailResult?.skipped) };
}

async function sendPasswordResetEmail(user, otp) {
  await sendEmail({
    to: user.email,
    subject: "Your Ternkonnect password reset code",
    html: passwordResetEmailTemplate({ name: user.name, otp }),
  });
}

router.post("/register", async (req, res) => {
  try {
    const { name, email, password, role, organizationName } = req.body;

    const normalizedEmail = normalizeEmail(email);
    const existingUser = await User.findOne({ where: { email: normalizedEmail } });
    
    if (existingUser) {
      if (!existingUser.emailVerified) {
        existingUser.name = name;
        const hashedPassword = await bcrypt.hash(password, 10);
        existingUser.password = hashedPassword;
        const verification = await sendVerificationEmail(existingUser);
        return res.status(200).json({
          message: verification.skipped ? "Account updated. Verification email could not be sent. Check logs." : "Account updated. Verification email resent.",
          verificationLink: verification.skipped ? verification.link : undefined,
        });
      }
      return res.status(400).json({ error: "Email already exists" });
    }

    const hashedPassword = await bcrypt.hash(password, 10);
    let organizationId = null;

    if (role === "org_admin" && organizationName) {
      const org = await Organization.create({ name: organizationName });
      organizationId = org.id;
    }

    const user = await User.create({
      name,
      email: normalizedEmail,
      password: hashedPassword,
      role: role || "solo",
      organizationId,
      emailVerified: false,
    });

    const verification = await sendVerificationEmail(user);
    res.status(201).json({
      message: verification.skipped ? "Account created. Verification email could not be sent. Check logs." : "Account created. Check your email to verify your account.",
      verificationLink: verification.skipped ? verification.link : undefined,
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

router.get("/verify-email", async (req, res) => {
  try {
    const { token, email } = req.query;
    if (!token || !email) return res.status(400).json({ error: "Verification token is required" });

    const user = await User.findOne({ where: { email: normalizeEmail(String(email)) } });

    if (!user || user.emailVerificationToken !== hashValue(String(token)) || !user.emailVerificationExpires || user.emailVerificationExpires < new Date()) {
      return res.status(400).json({ error: "Invalid or expired verification link" });
    }

    user.emailVerified = true;
    user.emailVerificationToken = null;
    user.emailVerificationExpires = null;
    await user.save();

    res.json({ message: "Email verified. You can now log in." });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

router.post("/login", async (req, res) => {
  try {
    const { email, password } = req.body;
    const user = await User.findOne({ where: { email: normalizeEmail(email) } });
    if (!user) return res.status(404).json({ error: "User not found" });
    if (user.status === "suspended") return res.status(403).json({ error: "Account suspended" });

    if (!user.emailVerified) return res.status(403).json({ error: "Please verify your email address before logging in." });

    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) return res.status(401).json({ error: "Invalid credentials" });

    const token = jwt.sign({ id: user.id, role: user.role, organizationId: user.organizationId }, process.env.JWT_SECRET, { expiresIn: "1d" });
    res.json({ token, user: { id: user.id, name: user.name, email: user.email, role: user.role } });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

router.post("/forgot-password", async (req, res) => {
  try {
    const { email } = req.body;
    const user = await User.findOne({ where: { email: normalizeEmail(email) } });
    if (!user) return res.json({ message: "If that email exists, a reset code has been sent." });

    const otp = Math.floor(100000 + Math.random() * 900000).toString();
    user.passwordResetToken = hashValue(otp);
    user.passwordResetExpires = tokenExpiry(10);
    await user.save();

    const emailResult = await sendPasswordResetEmail(user, otp);
    if (emailResult?.skipped) {
      console.warn(`Password reset OTP for ${user.email}: ${otp}`);
    }

    res.json({ message: "If that email exists, a reset code has been sent." });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

router.post("/reset-password", async (req, res) => {
  try {
    const { email, otp, password } = req.body;
    const user = await User.findOne({ where: { email: normalizeEmail(email) } });

    if (!user || user.passwordResetToken !== hashValue(String(otp)) || !user.passwordResetExpires || user.passwordResetExpires < new Date()) {
      return res.status(400).json({ error: "Invalid or expired reset code" });
    }

    user.password = await bcrypt.hash(password, 10);
    user.passwordResetToken = null;
    user.passwordResetExpires = null;
    await user.save();

    res.json({ message: "Password reset successful. You can now log in." });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

module.exports = router;
