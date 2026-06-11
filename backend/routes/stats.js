const express = require("express");
const { User, Organization, UsageLog } = require("../models");
const authenticateToken = require("../middleware/authenticate");

const router = express.Router();

// Get stats based on user role
router.get("/", authenticateToken, async (req, res) => {
  try {
    const { id: userId, role, organizationId } = req.user;

    let totalUsers = 0;
    let totalOrgs = 0;
    let totalUsageLogs = 0;
    let usageLogs = [];

    if (role === "superadmin") {
      // Superadmin sees everything
      totalUsers = await User.count();
      totalOrgs = await Organization.count();
      totalUsageLogs = await UsageLog.count();
      usageLogs = await UsageLog.findAll({
        include: [
          { model: User, as: "user", attributes: ["name", "email"] },
          { model: Organization, as: "organization", attributes: ["name"] },
        ],
        order: [["createdAt", "DESC"]],
        limit: 100,
      });
    } else if (role === "org_admin" && organizationId) {
      // Org admin sees only their org's data
      totalUsers = await User.count({ where: { organizationId } });
      totalUsageLogs = await UsageLog.count({ where: { organizationId } });
      usageLogs = await UsageLog.findAll({
        where: { organizationId },
        include: [{ model: User, as: "user", attributes: ["name", "email"] }],
        order: [["createdAt", "DESC"]],
        limit: 100,
      });
    } else {
      // Solo / org_user sees only their personal data
      totalUsageLogs = await UsageLog.count({ where: { userId } });
      usageLogs = await UsageLog.findAll({
        where: { userId },
        order: [["createdAt", "DESC"]],
        limit: 100,
      });
    }

    res.json({
      role,
      stats: {
        totalUsers,
        totalOrgs,
        totalUsageLogs,
      },
      recentUsage: usageLogs,
    });
  } catch (error) {
    console.error("Error fetching stats:", error);
    res.status(500).json({ error: "Failed to fetch stats" });
  }
});

module.exports = router;
