const express = require("express");
const bcrypt = require("bcryptjs");
const { User, IntegrationPin, UsageLog, Tool, Subscription } = require("../models");

const router = express.Router();

// Extention / Widget calls this endpoint to authenticate
router.post("/auth", async (req, res) => {
  try {
    const { email, pin, toolName } = req.body;

    const user = await User.findOne({ where: { email } });
    if (!user) return res.status(401).json({ error: "Invalid email or PIN" });

    // Find a valid PIN for this user
    const pins = await IntegrationPin.findAll({ where: { userId: user.id, status: "active" } });
    let isValid = false;
    let validPinId = null;

    for (let p of pins) {
      if (await bcrypt.compare(pin, p.pin)) {
        isValid = true;
        validPinId = p.id;
        break;
      }
    }

    if (!isValid) return res.status(401).json({ error: "Invalid email or PIN" });

    // Optionally, check if tool exists and role is allowed
    // const tool = await Tool.findOne({ where: { name: toolName } });
    
    // In a real app, check Subscription status here

    res.json({ message: "Authenticated successfully", token: "placeholder_proxy_token" });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Extention / Widget calls this endpoint instead of Gemini directly
router.post("/proxy", async (req, res) => {
  // 1. Authenticate user/pin (can use a simplified token from the /auth step)
  // 2. Forward the prompt/image to the real Gemini API
  // 3. Log usage in UsageLog
  // 4. Return the response to the tool

  // Placeholder for demonstration
  res.json({ result: "This is a proxied response from Gemini" });
});

module.exports = router;
