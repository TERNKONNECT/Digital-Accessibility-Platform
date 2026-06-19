require("dotenv").config();
const express = require("express");
const cors = require("cors");
const http = require("http");
const WebSocket = require("ws");
const bcrypt = require("bcryptjs");
const url = require("url");
const { sequelize, User, IntegrationPin, UsageLog } = require("./models");

const app = express();
const server = http.createServer(app);
app.use(cors());
app.use(express.json());

// Basic health check
app.get("/health", (req, res) => res.json({ status: "ok" }));

const authRoutes = require("./routes/auth");
const pinRoutes = require("./routes/pin");
const toolsRoutes = require("./routes/tools");
const statsRoutes = require("./routes/stats");
const platformRoutes = require("./routes/platform");

app.use("/api/auth", authRoutes);
app.use("/api/pin", pinRoutes);
app.use("/api/tools", toolsRoutes);
app.use("/api/stats", statsRoutes);
app.use("/api/platform", platformRoutes);

const PORT = process.env.PORT || 9001;

// WebSocket Proxy Setup
const wss = new WebSocket.Server({ noServer: true });

server.on("upgrade", async (request, socket, head) => {
  const { pathname, query } = url.parse(request.url, true);

  if (pathname === "/api/tools/proxy") {
    const { email, pin } = query;

    // Authenticate
    const user = await User.findOne({ where: { email } });
    if (!user) {
      socket.write('HTTP/1.1 401 Unauthorized\r\n\r\n');
      socket.destroy();
      return;
    }

    const pins = await IntegrationPin.findAll({ where: { userId: user.id, status: "active" } });
    let isValid = false;
    for (let p of pins) {
      if (await bcrypt.compare(pin, p.pin)) {
        isValid = true;
        break;
      }
    }

    if (!isValid) {
      socket.write('HTTP/1.1 401 Unauthorized\r\n\r\n');
      socket.destroy();
      return;
    }

    wss.handleUpgrade(request, socket, head, (ws) => {
      wss.emit("connection", ws, request, user);
    });
  } else {
    socket.destroy();
  }
});

wss.on("connection", (clientWs, request, user) => {
  // We don't have GEMINI_API_KEY_FALLBACK, assume the server provides it via .env
  // For safety if not provided, just drop connection or use placeholder
  const geminiApiKey = process.env.GEMINI_API_KEY || 'YOUR_MASTER_GEMINI_KEY';
  const targetUrl = `wss://generativelanguage.googleapis.com/ws/google.ai.generativelanguage.v1beta.GenerativeService.BidiGenerateContent?key=${geminiApiKey}`;

  const targetWs = new WebSocket(targetUrl);

  targetWs.on("open", () => {
    console.log(`[Proxy] Connected to Gemini for User: ${user.email}`);
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

sequelize.sync({ alter: true })
  .then(() => {
    console.log("Database connected and synced");
    server.listen(PORT, () => {
      console.log(`Server running on port ${PORT}`);
    });
  })
  .catch(err => {
    console.error("Unable to connect to the database:", err);
  });
