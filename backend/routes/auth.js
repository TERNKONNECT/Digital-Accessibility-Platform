const express = require("express");
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const { User, Organization } = require("../models");

const router = express.Router();

router.post("/register", async (req, res) => {
  try {
    const { name, email, password, role, organizationName } = req.body;

    const existingUser = await User.findOne({ where: { email } });
    if (existingUser) return res.status(400).json({ error: "Email already exists" });

    const hashedPassword = await bcrypt.hash(password, 10);
    
    let organizationId = null;

    if (role === "org_admin" && organizationName) {
      const org = await Organization.create({ name: organizationName });
      organizationId = org.id;
    }

    const user = await User.create({
      name,
      email,
      password: hashedPassword,
      role,
      organizationId,
    });

    const token = jwt.sign({ id: user.id, role: user.role, organizationId }, process.env.JWT_SECRET, { expiresIn: "1d" });
    
    res.json({ token, user: { id: user.id, name: user.name, email: user.email, role: user.role } });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

router.post("/login", async (req, res) => {
  try {
    const { email, password } = req.body;
    const user = await User.findOne({ where: { email } });
    if (!user) return res.status(404).json({ error: "User not found" });
    if (user.status === "suspended") return res.status(403).json({ error: "Account suspended" });

    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) return res.status(401).json({ error: "Invalid credentials" });

    const token = jwt.sign({ id: user.id, role: user.role, organizationId: user.organizationId }, process.env.JWT_SECRET, { expiresIn: "1d" });
    res.json({ token, user: { id: user.id, name: user.name, email: user.email, role: user.role } });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

module.exports = router;
