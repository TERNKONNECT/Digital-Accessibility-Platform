const express = require("express");
const { UsageLog } = require("../models");

const router = express.Router();

// Service-to-service auth — this is digital-accessibility-intelligence
// reporting usage, never a user's browser, so it carries a static shared
// secret instead of a user JWT.
function authenticateService(req, res, next) {
  const key = req.headers["x-service-key"];
  if (!key || key !== process.env.INTELLIGENCE_SERVICE_KEY) {
    return res.status(401).json({ error: "Invalid or missing service key" });
  }
  next();
}

router.post("/report", authenticateService, async (req, res) => {
  try {
    const { user_id, integration_id, session_duration_seconds, tool_call_count, audio_seconds } = req.body;
    if (!user_id) return res.status(400).json({ error: "user_id is required" });

    const log = await UsageLog.create({
      userId: user_id,
      integrationId: integration_id || null,
      actionType: "voice_session",
      durationSeconds: session_duration_seconds || 0,
      toolCallCount: tool_call_count || 0,
      audioSeconds: audio_seconds || 0,
    });

    res.status(201).json({ success: true, id: log.id });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

module.exports = router;
