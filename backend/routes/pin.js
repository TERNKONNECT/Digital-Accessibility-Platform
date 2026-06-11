const express = require("express");
const { IntegrationPin, User } = require("../models");
const bcrypt = require("bcryptjs");

const router = express.Router();

// Middleware to authenticate JWT (Placeholder, you should implement an actual middleware)
const authenticate = require("../middleware/authenticate");

router.post("/generate", authenticate, async (req, res) => {
  try {
    // Generate a random 6-digit pin
    const rawPin = Math.floor(100000 + Math.random() * 900000).toString();
    const hashedPin = await bcrypt.hash(rawPin, 10);

    const pin = await IntegrationPin.create({
      userId: req.user.id,
      organizationId: req.user.organizationId,
      pin: hashedPin,
    });

    // Return the raw pin ONCE
    res.json({ message: "Pin generated successfully", rawPin, id: pin.id });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

router.get("/", authenticate, async (req, res) => {
  try {
    const pins = await IntegrationPin.findAll({
      where: { userId: req.user.id }
    });
    res.json(pins);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

module.exports = router;
