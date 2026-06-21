const express = require("express");
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const crypto = require("crypto");
const { User, Organization } = require("../models");
const { verificationOtpEmailTemplate, passwordResetEmailTemplate, sendEmail } = require("../config/email.js");
const authenticateToken = require("../middleware/authenticate");

const router = express.Router();

const hashValue = (value) => crypto.createHash("sha256").update(value).digest("hex");
const normalizeEmail = (email) => email.toLowerCase().trim();
const tokenExpiry = (minutes) => new Date(Date.now() + minutes * 60 * 1000);
const generateOtp = () => Math.floor(100000 + Math.random() * 900000).toString();

async function sendVerificationEmail(user) {
  const otp = generateOtp();
  user.emailVerificationToken = hashValue(otp);
  user.emailVerificationExpires = tokenExpiry(30);
  await user.save();

  const emailResult = await sendEmail({
    to: user.email,
    subject: "Verify your Ternkonnect account",
    html: verificationOtpEmailTemplate({ name: user.name, otp }),
  });

  if (emailResult?.skipped) {
    console.warn(`Verification OTP for ${user.email}: ${otp}`);
  }

  return { otp, skipped: Boolean(emailResult?.skipped) };
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
          message: verification.skipped ? "Account updated. Verification email could not be sent. Check logs." : "Account updated. Verification code resent.",
          verificationOtp: verification.skipped ? verification.otp : undefined,
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
      message: verification.skipped ? "Account created. Verification email could not be sent. Check logs." : "Account created. Check your email for a verification code.",
      verificationOtp: verification.skipped ? verification.otp : undefined,
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

router.post("/verify-email", async (req, res) => {
  try {
    const { email, otp } = req.body;
    if (!email || !otp) return res.status(400).json({ error: "Email and verification code are required" });

    const user = await User.findOne({ where: { email: normalizeEmail(String(email)) } });

    if (!user || user.emailVerificationToken !== hashValue(String(otp)) || !user.emailVerificationExpires || user.emailVerificationExpires < new Date()) {
      return res.status(400).json({ error: "Invalid or expired verification code" });
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

router.post("/resend-verification", async (req, res) => {
  try {
    const { email } = req.body;
    if (!email) return res.status(400).json({ error: "Email is required" });

    const user = await User.findOne({ where: { email: normalizeEmail(String(email)) } });
    if (!user || user.emailVerified) {
      return res.json({ message: "If that account needs verification, a new code has been sent." });
    }

    const verification = await sendVerificationEmail(user);
    res.json({
      message: "If that account needs verification, a new code has been sent.",
      verificationOtp: verification.skipped ? verification.otp : undefined,
    });
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
    res.json({ token, user: { id: user.id, name: user.name, email: user.email, role: user.role, mustChangePassword: user.mustChangePassword } });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

router.post("/forgot-password", async (req, res) => {
  try {
    const { email } = req.body;
    const user = await User.findOne({ where: { email: normalizeEmail(email) } });
    if (!user) return res.json({ message: "If that email exists, a reset code has been sent." });

    const otp = generateOtp();
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

router.get("/me", authenticateToken, async (req, res) => {
  try {
    const user = await User.findByPk(req.user.id, {
      attributes: ["id", "name", "email", "role", "organizationId", "emailVerified", "createdAt"],
    });
    if (!user) return res.status(404).json({ error: "User not found" });
    res.json(user);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

router.patch("/profile", authenticateToken, async (req, res) => {
  try {
    const { name, email } = req.body;
    const user = await User.findByPk(req.user.id);
    if (!user) return res.status(404).json({ error: "User not found" });

    if (name) user.name = name;

    let verificationRequired = false;
    const normalizedEmail = email ? normalizeEmail(email) : null;
    if (normalizedEmail && normalizedEmail !== user.email) {
      const existing = await User.findOne({ where: { email: normalizedEmail } });
      if (existing) return res.status(400).json({ error: "Email already in use" });

      user.email = normalizedEmail;
      user.emailVerified = false;
      verificationRequired = true;
    }

    await user.save();

    let verificationOtp;
    if (verificationRequired) {
      const verification = await sendVerificationEmail(user);
      verificationOtp = verification.skipped ? verification.otp : undefined;
    }

    res.json({
      user: { id: user.id, name: user.name, email: user.email, role: user.role, organizationId: user.organizationId },
      verificationRequired,
      verificationOtp,
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

router.post("/change-password", authenticateToken, async (req, res) => {
  try {
    const { currentPassword, newPassword } = req.body;
    if (!currentPassword || !newPassword) return res.status(400).json({ error: "Current and new password are required" });

    const user = await User.findByPk(req.user.id);
    if (!user) return res.status(404).json({ error: "User not found" });

    const isMatch = await bcrypt.compare(currentPassword, user.password);
    if (!isMatch) return res.status(401).json({ error: "Current password is incorrect" });

    user.password = await bcrypt.hash(newPassword, 10);
    user.mustChangePassword = false;
    await user.save();

    res.json({ message: "Password changed successfully." });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

module.exports = router;
