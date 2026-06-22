require("dotenv").config();
const express = require("express");
const cors = require("cors");
const http = require("http");
const WebSocket = require("ws");
const bcrypt = require("bcryptjs");
const url = require("url");
const { sequelize, User, IntegrationPin, UsageLog, ChromeIntegration, Subscription } = require("./models");

const path = require("path");
const app = express();
const server = http.createServer(app);
app.use(cors());
app.use(express.json({
  verify: (req, res, buf) => {
    req.rawBody = buf;
  }
}));
app.use("/extension", express.static(path.join(__dirname, "../../new-chrome-extension")));


// Basic health check
app.get("/health", (req, res) => res.json({ status: "ok" }));

const authRoutes = require("./routes/auth");
const pinRoutes = require("./routes/pin");
const toolsRoutes = require("./routes/tools");
const statsRoutes = require("./routes/stats");
const platformRoutes = require("./routes/platform");

const swaggerUi = require("swagger-ui-express");
const swaggerDocument = require("./swagger.json");

app.use("/api/auth", authRoutes);
app.use("/api/pin", pinRoutes);
app.use("/api/tools", toolsRoutes);
app.use("/api/stats", statsRoutes);
app.use("/api/platform", platformRoutes);

// Swagger Documentation
app.use("/docs", swaggerUi.serve, swaggerUi.setup(swaggerDocument));

// Landing Page
app.get("/", (req, res) => {
  res.send(`
    <!DOCTYPE html>
    <html lang="en">
    <head>
      <meta charset="UTF-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <title>TernKonnect API</title>
      <style>
        body { font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif; display: flex; justify-content: center; align-items: center; height: 100vh; background-color: #f4f4f5; margin: 0; }
        .container { text-align: center; background: white; padding: 3rem; border-radius: 12px; box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1); }
        h1 { color: #18181b; margin-bottom: 0.5rem; }
        p { color: #71717a; margin-bottom: 2rem; }
        .btn { background-color: #0ea5e9; color: white; padding: 0.75rem 1.5rem; border-radius: 6px; text-decoration: none; font-weight: 500; transition: background-color 0.2s; }
        .btn:hover { background-color: #0284c7; }
      </style>
    </head>
    <body>
      <div class="container">
        <h1>🚀 API is Live</h1>
        <p>TernKonnect Digital Accessibility Platform API is running successfully.</p>
        <a href="/docs" class="btn">View API Documentation</a>
      </div>
    </body>
    </html>
  `);
});

const PORT = process.env.PORT || 9001;

// WebSocket Proxy Setup
const wss = new WebSocket.Server({ noServer: true });

server.on("upgrade", async (request, socket, head) => {
  const { pathname, query } = url.parse(request.url, true);

  if (pathname === "/api/tools/proxy") {
    const { email, pin, integrationCode, trial, profileId } = query;

    let user = null;

    if (trial === "true") {
      // Allow trials to connect
      user = { email: `trial-${profileId || "anonymous"}`, id: null };
    } else {
      const codeToUse = integrationCode || pin;
      if (!email || !codeToUse) {
        socket.write('HTTP/1.1 401 Unauthorized\r\n\r\n');
        socket.destroy();
        return;
      }

      // Check ChromeIntegration code
      const integration = await ChromeIntegration.findOne({
        where: { integrationCode: codeToUse },
        include: [{ model: User, as: "user" }]
      });

      if (integration && integration.user && integration.user.email.toLowerCase() === email.toLowerCase()) {
        user = integration.user;
        
        // Verify active subscription
        const subscription = await Subscription.findByPk(user.subscriptionId);
        if (!subscription || subscription.status !== "active") {
          socket.write('HTTP/1.1 402 Payment Required\r\n\r\n');
          socket.destroy();
          return;
        }
      } else {
        // Fallback to IntegrationPin
        const foundUser = await User.findOne({ where: { email } });
        if (foundUser) {
          const pins = await IntegrationPin.findAll({ where: { userId: foundUser.id, status: "active" } });
          let isValid = false;
          for (let p of pins) {
            if (await bcrypt.compare(codeToUse, p.pin)) {
              isValid = true;
              break;
            }
          }
          if (isValid) {
            user = foundUser;
          }
        }
      }

      if (!user) {
        socket.write('HTTP/1.1 401 Unauthorized\r\n\r\n');
        socket.destroy();
        return;
      }
    }

    wss.handleUpgrade(request, socket, head, (ws) => {
      wss.emit("connection", ws, request, user, profileId);
    });
  } else {
    socket.destroy();
  }
});

wss.on("connection", (clientWs, request, user, profileId) => {
  // We don't have GEMINI_API_KEY_FALLBACK, assume the server provides it via .env
  // For safety if not provided, just drop connection or use placeholder
  const geminiApiKey = process.env.GEMINI_API_KEY || 'YOUR_MASTER_GEMINI_KEY';
  const targetUrl = `wss://generativelanguage.googleapis.com/ws/google.ai.generativelanguage.v1beta.GenerativeService.BidiGenerateContent?key=${geminiApiKey}`;

  const targetWs = new WebSocket(targetUrl);

  targetWs.on("open", () => {
    console.log(`[Proxy] Connected to Gemini for User: ${user.email} (Profile: ${profileId || "unknown"})`);
  });

  clientWs.on("message", (message) => {
    if (targetWs.readyState === WebSocket.OPEN) {
      targetWs.send(message);
    }
  });

  targetWs.on("message", (message) => {
    if (clientWs.readyState === WebSocket.OPEN) {
      clientWs.send(message);
    }
  });

  clientWs.on("close", () => {
    targetWs.close();
  });

  targetWs.on("close", () => {
    clientWs.close();
  });

  targetWs.on("error", (err) => {
    console.error("[Proxy] Gemini WS Error:", err.message);
    clientWs.close();
  });
});

const fs = require("fs");
const seedPath = path.join(__dirname, "seed.js");
let seedDatabase = null;
if (fs.existsSync(seedPath)) {
  seedDatabase = require("./seed");
}

sequelize.sync()
  .then(async () => {
    console.log("Database connected and synced");
    try {
      // Migrate currency and amount units to Naira (if not already migrated)
            const { SubscriptionPlan, PaymentHistory, Subscription } = require("./models");
      
      // Update legacy "paid" status to "successful" via raw query to bypass model enum validation
      await sequelize.query("UPDATE PaymentHistories SET status = 'successful' WHERE status = 'paid';").catch(() => {});

      const plans = await SubscriptionPlan.findAll();
      for (const plan of plans) {
        let updatedAmount = plan.amount;
        if (plan.amount > 1000) {
          updatedAmount = Math.round(plan.amount / 100);
        }
        await plan.update({ currency: "NGN", amount: updatedAmount });
      }
      const payments = await PaymentHistory.findAll();
      for (const p of payments) {
        let updatedAmount = p.amount;
        if (p.amount > 1000) {
          updatedAmount = Math.round(p.amount / 100);
        }
        await p.update({ currency: "NGN", amount: updatedAmount });
      }
      console.log("Database migration to NGN & Naira complete.");

      // Heal orphaned subscriptions where planId is null but plan matches an active SubscriptionPlan name
      const activePlans = await SubscriptionPlan.findAll({ where: { status: "active" } });
      const orphanedSubs = await Subscription.findAll({ where: { planId: null } });
      for (const sub of orphanedSubs) {
        const matchingPlan = activePlans.find(p => p.name.toLowerCase().trim() === sub.plan?.toLowerCase().trim());
        if (matchingPlan) {
          await sub.update({ planId: matchingPlan.id });
          console.log(`Healed orphaned subscription ${sub.id}: linked to active plan ${matchingPlan.name} (${matchingPlan.id})`);
        }
      }
    } catch (migErr) {
      console.error("Failed to run data migration to NGN:", migErr);
    }
    try {
      if (seedDatabase) {
        await seedDatabase();
      }
    } catch (seedErr) {
      console.error("Failed to seed database on startup:", seedErr);
    }
    server.listen(PORT, () => {
      console.log(`Server running on port ${PORT}`);
    });
  })
  .catch(err => {
    console.error("Unable to connect to the database:", err);
  });

module.exports = app;

