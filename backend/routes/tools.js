const express = require("express");
const bcrypt = require("bcryptjs");
const crypto = require("crypto");
const { User, IntegrationPin, UsageLog, Tool, Subscription } = require("../models");
const authenticateToken = require("../middleware/authenticate");

const router = express.Router();

// Get all available tools
router.get("/", authenticateToken, async (req, res) => {
  try {
    const tools = await Tool.findAll();
    res.json(tools);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Generate an Integration PIN for a specific tool
router.post("/:id/generate-pin", authenticateToken, async (req, res) => {
  try {
    const { id: toolId } = req.params;
    const { id: userId, organizationId } = req.user;

    const tool = await Tool.findByPk(toolId);
    if (!tool) return res.status(404).json({ error: "Tool not found" });

    // Generate a random 6-digit PIN
    const plainPin = Math.floor(100000 + Math.random() * 900000).toString();
    const hashedPin = await bcrypt.hash(plainPin, 10);

    const pin = await IntegrationPin.create({
      pin: hashedPin,
      toolId,
      userId,
      organizationId,
      status: "active",
    });

    // Return the plaintext pin ONCE
    res.status(201).json({ pin: plainPin, message: "Save this PIN securely. It will not be shown again." });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Extension / Widget calls this endpoint to authenticate
router.post("/auth", async (req, res) => {
  try {
    const { email, pin, toolName } = req.body;

    const user = await User.findOne({ where: { email } });
    if (!user) return res.status(401).json({ error: "Invalid email or PIN" });

    // Find a valid PIN for this user
    const pins = await IntegrationPin.findAll({ where: { userId: user.id, status: "active" } });
    let isValid = false;

    for (let p of pins) {
      if (await bcrypt.compare(pin, p.pin)) {
        isValid = true;
        break;
      }
    }

    if (!isValid) return res.status(401).json({ error: "Invalid email or PIN" });

    res.json({ message: "Authenticated successfully", token: "placeholder_proxy_token" });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

router.post("/proxy", async (req, res) => {
  res.json({ result: "This is a proxied response from Gemini" });
});

module.exports = router;
