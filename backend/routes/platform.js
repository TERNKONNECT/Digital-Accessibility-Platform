const express = require("express");
const crypto = require("crypto");
const bcrypt = require("bcryptjs");
const { Op } = require("sequelize");
const authenticateToken = require("../middleware/authenticate");
const { adminInvitePasswordEmailTemplate, sendEmail } = require("../config/email.js");
const {
  User,
  Subscription,
  SubscriptionPlan,
  ChromeIntegration,
  ChromeProfile,
  ChromeProfileActivity,
  WidgetSite,
  PaymentHistory,
  ActivityLog,
  SystemSetting,
} = require("../models");

const router = express.Router();

async function getSettings() {
  try {
    let settings = await SystemSetting.findOne();
    if (!settings) {
      settings = await SystemSetting.create({
        adminMaxChromeProfiles: 9999,
        adminMaxWebsites: 9999,
        defaultTrialDurationMinutes: 5,
        defaultTrialSessions: 3
      });
    }
    return settings;
  } catch (err) {
    console.error("Error reading SystemSetting DB model:", err);
    return {
      adminMaxChromeProfiles: 9999,
      adminMaxWebsites: 9999,
      defaultTrialDurationMinutes: 5,
      defaultTrialSessions: 3
    };
  }
}

const DEFAULT_PLANS = [
  { name: "Starter", amount: 29, maxChromeProfiles: 5, maxWebsites: 1, currency: "NGN" },
  { name: "Pro", amount: 79, maxChromeProfiles: 25, maxWebsites: 10, currency: "NGN" },
  { name: "Enterprise", amount: 0, maxChromeProfiles: null, maxWebsites: null, billingCycle: "yearly", currency: "NGN" },
];

function code(prefix) {
  return `${prefix}-${Math.floor(100000 + Math.random() * 900000)}`;
}

function generateTempPassword() {
  return crypto.randomBytes(9).toString("base64").replace(/[^a-zA-Z0-9]/g, "").slice(0, 12);
}

function isAtLimit(count, limit) {
  return limit !== null && limit !== undefined && count >= limit;
}

function renewalDate() {
  const date = new Date();
  date.setMonth(date.getMonth() + 1);
  return date;
}

async function logActivity(userId, actionType, description, metadata = {}) {
  return ActivityLog.create({ userId, actionType, description, metadata });
}

async function ensurePlans() {
  const planCount = await SubscriptionPlan.count();
  if (planCount === 0) {
    for (const plan of DEFAULT_PLANS) {
      await SubscriptionPlan.create({
        billingCycle: "monthly",
        chromeExtensionAccess: true,
        widgetAccess: true,
        status: "active",
        ...plan
      });
    }
  }
}

async function ensureSubscription(userId) {
  await ensurePlans();
  const user = await User.findByPk(userId, { include: [{ model: Subscription, as: "subscription", include: [{ model: SubscriptionPlan, as: "planDetails" }] }] });
  if (!user.subscription) {
    let starter = await SubscriptionPlan.findOne({ where: { name: "Starter" } });
    if (!starter) {
      // Fallback: Cheaper active plan or any active plan
      starter = await SubscriptionPlan.findOne({ where: { status: "active" }, order: [["amount", "ASC"]] });
    }
    const planName = starter ? starter.name : "Starter";
    const planId = starter ? starter.id : null;
    const maxChromeProfiles = starter ? starter.maxChromeProfiles : 5;
    const maxWebsites = starter ? starter.maxWebsites : 1;

    const subscription = await Subscription.create({
      plan: planName,
      targetEntity: "user",
      status: "active",
      planId: planId,
      limits: { maxChromeProfiles, maxWebsites },
      endsAt: renewalDate(),
    });
    await user.update({ subscriptionId: subscription.id });
    await logActivity(userId, "subscription_created", `${planName} subscription activated`, { plan: planName });
    return Subscription.findByPk(subscription.id, { include: [{ model: SubscriptionPlan, as: "planDetails" }] });
  }
  return user.subscription;
}

async function serializeSubscription(subscription, userRole) {
  const plan = subscription?.planDetails;
  const isPlanActive = plan && plan.status === "active";

  if (userRole === "superadmin") {
    const settings = await getSettings();
    return {
      id: subscription?.id,
      planName: "Super Admin (Unlimited)",
      status: "active",
      price: 0,
      currency: "NGN",
      billingCycle: "monthly",
      renewalDate: null,
      chromeExtensionAccess: true,
      widgetAccess: true,
      maxChromeProfiles: settings.adminMaxChromeProfiles || null,
      maxWebsites: settings.adminMaxWebsites || null,
    };
  }

  if (!isPlanActive) {
    return {
      id: subscription?.id,
      planName: "None",
      status: "inactive",
      price: 0,
      currency: "NGN",
      billingCycle: "monthly",
      renewalDate: null,
      chromeExtensionAccess: false,
      widgetAccess: false,
      maxChromeProfiles: 0,
      maxWebsites: 0,
    };
  }

  return {
    id: subscription?.id,
    planName: plan.name,
    status: subscription?.status || "active",
    price: plan.amount || 0,
    currency: plan.currency || "NGN",
    billingCycle: plan.billingCycle || "monthly",
    renewalDate: subscription?.endsAt,
    chromeExtensionAccess: plan.chromeExtensionAccess ?? true,
    widgetAccess: plan.widgetAccess ?? true,
    maxChromeProfiles: plan.maxChromeProfiles ?? subscription?.limits?.maxChromeProfiles ?? 5,
    maxWebsites: plan.maxWebsites ?? subscription?.limits?.maxWebsites ?? 1,
  };
}

async function getUserOverview(userId) {
  const user = await User.findByPk(userId, { attributes: ["role"] });
  const subscription = await ensureSubscription(userId);
  const chromeIntegration = await ChromeIntegration.findOne({
    where: { userId },
    include: [{ model: ChromeProfile, as: "profiles", order: [["lastActiveAt", "DESC"]] }],
  });
  const websites = await WidgetSite.findAll({ where: { userId }, order: [["createdAt", "DESC"]] });
  const activities = await ActivityLog.findAll({ where: { userId }, order: [["createdAt", "DESC"]], limit: 12 });
  const payments = await PaymentHistory.findAll({ where: { userId }, order: [["createdAt", "DESC"]], limit: 12 });
  const plan = await serializeSubscription(subscription, user?.role);
  const profiles = chromeIntegration?.profiles || [];
  const activeProfiles = profiles.filter((profile) => profile.status === "active").length;

  return {
    subscription: plan,
    totals: {
      toolsEnabled: Number(Boolean(chromeIntegration && plan.chromeExtensionAccess)) + Number(websites.length > 0 && plan.widgetAccess),
      widgetWebsites: websites.length,
      chromeProfiles: profiles.length,
      activeChromeProfiles: activeProfiles,
    },
    tools: {
      chromeExtension: {
        status: chromeIntegration && plan.status === "active" && plan.chromeExtensionAccess ? "active" : "inactive",
        integration: chromeIntegration,
        connectedProfiles: profiles,
        profileLimit: plan.maxChromeProfiles,
        lastActivity: chromeIntegration?.lastActivityAt,
        overLimit: plan.maxChromeProfiles !== null && profiles.length >= plan.maxChromeProfiles,
      },
      widget: {
        status: websites.some((site) => site.status === "active") && plan.status === "active" && plan.widgetAccess ? "active" : "inactive",
        websites,
        websiteLimit: plan.maxWebsites,
        lastActivity: websites.map((site) => site.lastActiveAt).filter(Boolean).sort().at(-1) || null,
        overLimit: plan.maxWebsites !== null && websites.length >= plan.maxWebsites,
      },
    },
    recentActivity: activities,
    payments,
  };
}

router.get("/overview", authenticateToken, async (req, res) => {
  try {
    res.json(await getUserOverview(req.user.id));
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

router.get("/plans", authenticateToken, async (_req, res) => {
  await ensurePlans();
  res.json(await SubscriptionPlan.findAll({ order: [["amount", "ASC"]] }));
});

router.post("/subscription/change", authenticateToken, async (req, res) => {
  try {
    const { planId } = req.body;
    const plan = await SubscriptionPlan.findByPk(planId);
    if (!plan || plan.status !== "active") return res.status(404).json({ error: "Plan not available" });

    const subscription = await ensureSubscription(req.user.id);
    await subscription.update({
      plan: plan.name,
      planId: plan.id,
      status: "active",
      limits: { maxChromeProfiles: plan.maxChromeProfiles, maxWebsites: plan.maxWebsites },
      endsAt: renewalDate(),
    });
    await logActivity(req.user.id, "subscription_changed", `Subscription changed to ${plan.name}`, { planId });
    res.json(await getUserOverview(req.user.id));
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

router.post("/chrome-integration", authenticateToken, async (req, res) => {
  try {
    const plan = await serializeSubscription(await ensureSubscription(req.user.id), req.user.role);
    if (!plan.chromeExtensionAccess) return res.status(403).json({ error: "Your plan does not include the Chrome Extension." });

    const existing = await ChromeIntegration.findOne({ where: { userId: req.user.id } });
    if (existing) return res.status(409).json({ error: "Chrome Extension integration already exists" });

    const integration = await ChromeIntegration.create({
      userId: req.user.id,
      name: req.body.name || "Chrome Extension Integration",
      integrationCode: code("ACCESS-EXT"),
      isInternal: req.user.role === "superadmin",
    });
    await logActivity(req.user.id, "tool_creation", "Chrome Extension integration created", { integrationId: integration.id });
    res.status(201).json(integration);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

router.post("/chrome-integration/regenerate", authenticateToken, async (req, res) => {
  try {
    const integration = await ChromeIntegration.findOne({ where: { userId: req.user.id } });
    if (!integration) return res.status(404).json({ error: "No Chrome Extension integration found" });
    await integration.update({ integrationCode: code("ACCESS-EXT"), status: "inactive" });
    await logActivity(req.user.id, "integration_code_regenerated", "Chrome Extension integration code regenerated", { integrationId: integration.id });
    res.json(integration);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

router.post("/chrome/track", async (req, res) => {
  try {
    const { integrationCode, profileId, profileName, chromeEmail, browserVersion, eventType } = req.body;
    const integration = await ChromeIntegration.findOne({ where: { integrationCode }, include: [{ model: User, as: "user" }] });
    if (!integration) return res.status(404).json({ error: "Invalid integration code" });

    // Set integration status to active since we have an active tracking integration
    if (integration.status !== "active") {
      await integration.update({ status: "active" });
    }

    const now = new Date();
    const existingProfile = await ChromeProfile.findOne({ where: { chromeIntegrationId: integration.id, profileId } });
    if (!existingProfile) {
      const profileCount = await ChromeProfile.count({ where: { chromeIntegrationId: integration.id } });
      const plan = await serializeSubscription(await ensureSubscription(integration.userId), integration.user?.role);
      if (isAtLimit(profileCount, plan.maxChromeProfiles)) {
        return res.status(403).json({ error: `Chrome profile limit reached (${plan.maxChromeProfiles}). Upgrade your plan to connect more devices.` });
      }
    }

    const [profile] = await ChromeProfile.findOrCreate({
      where: { chromeIntegrationId: integration.id, profileId },
      defaults: { chromeIntegrationId: integration.id, userId: integration.userId, profileId, profileName: profileName || "Chrome Profile", chromeEmail, browserVersion, loginTime: now, firstSeenAt: now, lastActiveAt: now },
    });

    await profile.update({
      profileName: profileName || profile.profileName,
      chromeEmail: chromeEmail || profile.chromeEmail,
      browserVersion: browserVersion || profile.browserVersion,
      status: eventType === "logout" ? "inactive" : "active",
      loginTime: eventType === "login" ? now : profile.loginTime,
      logoutTime: eventType === "logout" ? now : profile.logoutTime,
      lastActiveAt: now,
    });
    await integration.update({ lastActivityAt: now });
    await logActivity(integration.userId, "chrome_extension_activation", `Chrome profile ${profile.profileName} checked in`, { profileId, eventType });
    res.json({ status: "tracked", profile });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

router.post("/chrome/integrate", async (req, res) => {
  try {
    const { email, integrationCode, profileId, profileName, chromeEmail, browserVersion } = req.body;
    if (!email || !integrationCode || !profileId) {
      return res.status(400).json({ error: "Email, integrationCode, and profileId are required" });
    }

    const user = await User.findOne({
      where: { email: email.toLowerCase().trim() },
      include: [{ model: Subscription, as: "subscription" }]
    });

    if (!user) {
      return res.status(404).json({ error: "User with this email not found" });
    }

    if (!user.subscription || user.subscription.status !== "active") {
      return res.status(402).json({ error: "Active subscription required to integrate" });
    }

    const integration = await ChromeIntegration.findOne({
      where: { userId: user.id, integrationCode }
    });

    if (!integration) {
      return res.status(400).json({ error: "Invalid integration code for this email" });
    }

    // Set integration status to active
    await integration.update({ status: "active", lastActivityAt: new Date() });

    const now = new Date();
    // Check if there is an existing profile (even trial ones) and link it
    let profile = await ChromeProfile.findOne({ where: { profileId } });
    if (profile) {
      await profile.update({
        chromeIntegrationId: integration.id,
        userId: user.id,
        profileName: profileName || profile.profileName,
        chromeEmail: chromeEmail || profile.chromeEmail,
        browserVersion: browserVersion || profile.browserVersion,
        status: "active",
        loginTime: now,
        lastActiveAt: now
      });
    } else {
      const profileCount = await ChromeProfile.count({ where: { chromeIntegrationId: integration.id } });
      const plan = await serializeSubscription(await ensureSubscription(user.id), user.role);
      if (isAtLimit(profileCount, plan.maxChromeProfiles)) {
        return res.status(403).json({ error: `Chrome profile limit reached (${plan.maxChromeProfiles}). Upgrade your plan to connect more devices.` });
      }

      profile = await ChromeProfile.create({
        chromeIntegrationId: integration.id,
        userId: user.id,
        profileId,
        profileName: profileName || "Chrome Profile",
        chromeEmail,
        browserVersion,
        status: "active",
        loginTime: now,
        firstSeenAt: now,
        lastActiveAt: now
      });
    }

    await logActivity(user.id, "chrome_extension_integration", `Chrome profile ${profile.profileName} integrated`, { profileId });

    res.json({ success: true, message: "Chrome profile integrated successfully", profile });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

router.post("/chrome/log-activity", async (req, res) => {
  try {
    const { integrationCode, profileId, actionType, description, metadata } = req.body;
    if (!profileId || !actionType) {
      return res.status(400).json({ error: "profileId and actionType are required" });
    }

    let profile = await ChromeProfile.findOne({ where: { profileId } });

    // If it's a trial and profile doesn't exist, let's create it as a trial profile
    if (!profile && (!integrationCode || integrationCode.startsWith("TRIAL") || integrationCode === "inactive")) {
      profile = await ChromeProfile.create({
        profileId,
        profileName: "Trial Chrome Profile",
        chromeIntegrationId: null,
        userId: null,
        status: "active"
      });
    }

    if (!profile) {
      return res.status(404).json({ error: "Chrome profile not found" });
    }

    const activity = await ChromeProfileActivity.create({
      chromeProfileId: profile.id,
      actionType,
      description: description || `Executed ${actionType}`,
      metadata: metadata || {}
    });

    // Update last active
    const now = new Date();
    await profile.update({ lastActiveAt: now });
    if (profile.chromeIntegrationId) {
      await ChromeIntegration.update({ lastActivityAt: now }, { where: { id: profile.chromeIntegrationId } });
    }

    res.json({ success: true, activity });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

router.get("/chrome/profiles/:id/activities", authenticateToken, async (req, res) => {
  try {
    const activities = await ChromeProfileActivity.findAll({
      where: { chromeProfileId: req.params.id },
      order: [["createdAt", "DESC"]],
      limit: 50
    });
    res.json(activities);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

router.post("/widgets", authenticateToken, async (req, res) => {
  try {
    const plan = await serializeSubscription(await ensureSubscription(req.user.id), req.user.role);
    if (!plan.widgetAccess) return res.status(403).json({ error: "Your plan does not include the Website Widget." });

    const websiteCount = await WidgetSite.count({ where: { userId: req.user.id } });
    if (isAtLimit(websiteCount, plan.maxWebsites)) {
      return res.status(403).json({ error: `Website limit reached (${plan.maxWebsites}). Upgrade your plan to add more websites.` });
    }

    const widgetId = code("WIDGET");
    const integrationCode = code("ACCESS-WGT");
    const site = await WidgetSite.create({
      userId: req.user.id,
      websiteName: req.body.websiteName,
      websiteUrl: req.body.websiteUrl,
      widgetId,
      integrationCode,
      embedScript: `<script async src="https://cdn.ternkonnect.com/widget.js" data-widget-id="${widgetId}" data-integration-code="${integrationCode}"></script>`,
      isInternal: req.user.role === "superadmin",
    });
    await logActivity(req.user.id, "widget_creation", `Widget generated for ${site.websiteName}`, { widgetId });
    res.status(201).json(site);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

router.post("/widgets/track", async (req, res) => {
  try {
    const { integrationCode, eventType = "load" } = req.body;
    const site = await WidgetSite.findOne({ where: { integrationCode } });
    if (!site) return res.status(404).json({ error: "Invalid integration code" });

    const now = new Date();
    await site.update({
      status: "active",
      firstSeenAt: site.firstSeenAt || now,
      lastActiveAt: now,
      widgetLoads: site.widgetLoads + (eventType === "load" ? 1 : 0),
      usageCount: site.usageCount + 1,
      dailyUsage: site.dailyUsage + 1,
      weeklyUsage: site.weeklyUsage + 1,
      monthlyUsage: site.monthlyUsage + 1,
    });
    await logActivity(site.userId, "widget_activation", `Widget connected on ${site.websiteName}`, { widgetId: site.widgetId, eventType });
    res.json({ status: "tracked", site });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

router.get("/billing", authenticateToken, async (req, res) => {
  try {
    const overview = await getUserOverview(req.user.id);
    res.json({ subscription: overview.subscription, payments: overview.payments });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

router.get("/admin", authenticateToken, async (req, res) => {
  try {
    if (req.user.role !== "superadmin" && req.user.role !== "org_admin") return res.status(403).json({ error: "Admin access required" });
    const userWhere = req.user.role === "org_admin" ? { organizationId: req.user.organizationId } : {};

    // Superadmins' own tools/subscriptions are internal (dogfooding) and must
    // not count toward revenue or the customer-facing tool-management totals.
    const superadmins = await User.findAll({ where: { role: "superadmin" }, attributes: ["id", "subscriptionId"] });
    const superadminUserIds = superadmins.map((u) => u.id);
    const superadminSubscriptionIds = superadmins.map((u) => u.subscriptionId).filter(Boolean);

    const users = await User.findAll({
      where: userWhere,
      attributes: ["id", "name", "email", "role", "status", "createdAt"],
      include: [
        { model: Subscription, as: "subscription", include: [{ model: SubscriptionPlan, as: "planDetails" }] },
        { model: ChromeIntegration, as: "chromeIntegration", where: { isInternal: false }, required: false, include: [{ model: ChromeProfile, as: "profiles" }] },
        { model: WidgetSite, as: "widgetSites", where: { isInternal: false }, required: false },
      ],
      order: [["createdAt", "DESC"]],
    });
    const subscriptionWhere = { status: "active" };
    if (superadminSubscriptionIds.length > 0) subscriptionWhere.id = { [Op.notIn]: superadminSubscriptionIds };
    const activeSubscriptions = await Subscription.count({
      where: subscriptionWhere,
      include: [
        {
          model: SubscriptionPlan,
          as: "planDetails",
          where: { status: "active" },
          required: true
        }
      ]
    });

    const paymentWhere = {};
    if (superadminUserIds.length > 0) paymentWhere.userId = { [Op.notIn]: superadminUserIds };
    const payments = await PaymentHistory.findAll({
      where: paymentWhere,
      include: [{
        model: User,
        as: "user",
        attributes: ["name", "email"],
        include: [{ model: Subscription, as: "subscription", include: [{ model: SubscriptionPlan, as: "planDetails" }] }],
      }],
      order: [["createdAt", "DESC"]]
    });
    const activeSince = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
    const activities = await ActivityLog.findAll({ where: { createdAt: { [Op.gte]: activeSince } } });

    res.json({
      totals: {
        totalUsers: users.length,
        activeUsers: new Set(activities.map((activity) => activity.userId)).size,
        activeSubscriptions,
        revenue: payments.filter(p => p.status === "successful").reduce((sum, payment) => sum + payment.amount, 0),
        totalChromeProfiles: await ChromeProfile.count({ include: [{ model: ChromeIntegration, as: "integration", attributes: [], where: { isInternal: false }, required: true }] }),
        totalWebsites: await WidgetSite.count({ where: { isInternal: false } }),
        totalWidgetInstallations: await WidgetSite.count({ where: { status: "active", isInternal: false } }),
      },
      analytics: {
        dailyActiveUsers: new Set(activities.filter((activity) => activity.createdAt > new Date(Date.now() - 24 * 60 * 60 * 1000)).map((activity) => activity.userId)).size,
        monthlyActiveUsers: new Set(activities.map((activity) => activity.userId)).size,
        newSubscriptions: await Subscription.count({ where: { createdAt: { [Op.gte]: activeSince } } }),
        revenueGrowth: payments.filter(p => p.status === "successful").reduce((sum, payment) => sum + payment.amount, 0),
        activeIntegrations: await ChromeIntegration.count({ where: { status: "active", isInternal: false } }),
        activeWebsites: await WidgetSite.count({ where: { status: "active", isInternal: false } }),
        widgetUsage: await WidgetSite.sum("usageCount", { where: { isInternal: false } }),
      },
      users,
      payments,
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

router.post("/admin/invite-superadmin", authenticateToken, async (req, res) => {
  try {
    if (req.user.role !== "superadmin") return res.status(403).json({ error: "Super admin access required" });

    const { name, email } = req.body;
    if (!name || !email) return res.status(400).json({ error: "Name and email are required" });

    const normalizedEmail = email.toLowerCase().trim();
    const existing = await User.findOne({ where: { email: normalizedEmail } });
    if (existing) return res.status(400).json({ error: "Email already in use" });

    const tempPassword = generateTempPassword();
    const inviter = await User.findByPk(req.user.id, { attributes: ["name"] });

    const invitee = await User.create({
      name,
      email: normalizedEmail,
      password: await bcrypt.hash(tempPassword, 10),
      role: "superadmin",
      emailVerified: true,
      mustChangePassword: true,
    });

    const emailResult = await sendEmail({
      to: invitee.email,
      subject: "You've been invited to TernKonnect as an admin",
      html: adminInvitePasswordEmailTemplate({ name: invitee.name, inviterName: inviter?.name, tempPassword }),
    });
    if (emailResult?.skipped) {
      console.warn(`Temp password for invited superadmin ${invitee.email}: ${tempPassword}`);
    }

    await logActivity(req.user.id, "superadmin_invited", `Invited ${invitee.email} as a superadmin`, { inviteeId: invitee.id });

    res.status(201).json({
      message: emailResult?.skipped ? "Superadmin invited. Email could not be sent — check logs for the temp password." : "Superadmin invited. They'll receive their temporary password by email.",
      tempPassword: emailResult?.skipped ? tempPassword : undefined,
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

router.post("/admin/plans", authenticateToken, async (req, res) => {
  try {
    if (req.user.role !== "superadmin") return res.status(403).json({ error: "Super admin access required" });
    const plan = await SubscriptionPlan.create(req.body);
    res.status(201).json(plan);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

router.patch("/admin/plans/:id", authenticateToken, async (req, res) => {
  try {
    if (req.user.role !== "superadmin") return res.status(403).json({ error: "Super admin access required" });
    const plan = await SubscriptionPlan.findByPk(req.params.id);
    if (!plan) return res.status(404).json({ error: "Plan not found" });
    await plan.update(req.body);
    res.json(plan);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

router.patch("/admin/users/:id/status", authenticateToken, async (req, res) => {
  try {
    if (req.user.role !== "superadmin" && req.user.role !== "org_admin") return res.status(403).json({ error: "Admin access required" });
    const user = await User.findByPk(req.params.id);
    if (!user) return res.status(404).json({ error: "User not found" });
    if (req.user.role === "org_admin" && user.organizationId !== req.user.organizationId) return res.status(403).json({ error: "User is outside your organization" });
    const status = req.body.status === "suspended" ? "suspended" : "active";
    await user.update({ status });
    await logActivity(user.id, status === "suspended" ? "user_suspended" : "user_reactivated", `User account ${status}`, { changedBy: req.user.id });
    res.json({ id: user.id, status });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

router.delete("/admin/plans/:id", authenticateToken, async (req, res) => {
  try {
    if (req.user.role !== "superadmin") return res.status(403).json({ error: "Super admin access required" });
    const plan = await SubscriptionPlan.findByPk(req.params.id);
    if (!plan) return res.status(404).json({ error: "Plan not found" });

    // Check if there are active subscriptions on this plan
    const activeSubCount = await Subscription.count({
      where: { planId: plan.id, status: "active" }
    });

    if (activeSubCount > 0) {
      // Soft disable: make inactive so new users can't see it, but active users continue
      await plan.update({ status: "inactive" });
      res.json({ message: "Plan has active subscriptions. It was disabled instead of deleted.", plan });
    } else {
      // Hard delete if no active subscriptions
      await plan.destroy();
      res.status(204).send();
    }
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

const fs = require("fs");
const path = require("path");

router.post("/chrome/save-icons", async (req, res) => {
  try {
    const { size, dataUrl } = req.body;
    if (!size || !dataUrl) {
      return res.status(400).json({ error: "size and dataUrl are required" });
    }

    const base64Data = dataUrl.replace(/^data:image\/png;base64,/, "");
    const buffer = Buffer.from(base64Data, "base64");
    
    const iconsDir = path.join(__dirname, "../../../new-chrome-extension/icons");
    if (!fs.existsSync(iconsDir)) {
      fs.mkdirSync(iconsDir, { recursive: true });
    }

    const iconPath = path.join(iconsDir, `icon${size}.png`);
    fs.writeFileSync(iconPath, buffer);
    
    console.log(`[Platform] Saved icon${size}.png successfully`);
    res.json({ success: true, path: iconPath });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

router.post("/admin/users/:id/chrome-integration", authenticateToken, async (req, res) => {
  try {
    if (req.user.role !== "superadmin") return res.status(403).json({ error: "Super admin access required" });
    const user = await User.findByPk(req.params.id);
    if (!user) return res.status(404).json({ error: "User not found" });

    // Check if integration already exists
    let integration = await ChromeIntegration.findOne({ where: { userId: user.id } });
    if (integration) {
      await integration.update({
        integrationCode: code("ACCESS-EXT"),
        status: "inactive",
        lastActivityAt: null
      });
      // Clean up connected profiles
      await ChromeProfile.destroy({ where: { chromeIntegrationId: integration.id } });
    } else {
      integration = await ChromeIntegration.create({
        userId: user.id,
        name: req.body.name || "Chrome Extension Integration",
        integrationCode: code("ACCESS-EXT"),
        status: "inactive"
      });
    }

    await logActivity(req.user.id, "admin_chrome_integration_reset", `Reset Chrome Integration code for user: ${user.email}`, { targetUserId: user.id });
    res.json(integration);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

router.post("/admin/users/:id/chrome-integration/regenerate", authenticateToken, async (req, res) => {
  try {
    if (req.user.role !== "superadmin") return res.status(403).json({ error: "Super admin access required" });
    const user = await User.findByPk(req.params.id);
    if (!user) return res.status(404).json({ error: "User not found" });

    let integration = await ChromeIntegration.findOne({ where: { userId: user.id } });
    if (!integration) {
      integration = await ChromeIntegration.create({
        userId: user.id,
        name: "Chrome Extension Integration",
        integrationCode: code("ACCESS-EXT"),
        status: "inactive"
      });
    } else {
      await integration.update({
        integrationCode: code("ACCESS-EXT"),
        status: "inactive",
        lastActivityAt: null
      });
      // Clean up connected profiles
      await ChromeProfile.destroy({ where: { chromeIntegrationId: integration.id } });
    }

    await logActivity(req.user.id, "admin_chrome_integration_regenerated", `Regenerated Chrome Integration code for user: ${user.email}`, { targetUserId: user.id });
    res.json(integration);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

router.get("/admin/settings", authenticateToken, async (req, res) => {
  try {
    if (req.user.role !== "superadmin") return res.status(403).json({ error: "Super admin access required" });
    res.json(await getSettings());
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

router.post("/admin/settings", authenticateToken, async (req, res) => {
  try {
    if (req.user.role !== "superadmin") return res.status(403).json({ error: "Super admin access required" });
    const { adminMaxChromeProfiles, adminMaxWebsites, defaultTrialDurationMinutes, defaultTrialSessions } = req.body;

    let settings = await SystemSetting.findOne();
    if (!settings) {
      settings = await SystemSetting.create();
    }
    await settings.update({
      adminMaxChromeProfiles: adminMaxChromeProfiles !== undefined && adminMaxChromeProfiles !== "" ? Number(adminMaxChromeProfiles) : null,
      adminMaxWebsites: adminMaxWebsites !== undefined && adminMaxWebsites !== "" ? Number(adminMaxWebsites) : null,
      defaultTrialDurationMinutes: defaultTrialDurationMinutes !== undefined ? Number(defaultTrialDurationMinutes) : 5,
      defaultTrialSessions: defaultTrialSessions !== undefined ? Number(defaultTrialSessions) : 3,
    });

    await logActivity(req.user.id, "admin_settings_updated", "System settings updated by super admin", { settings });
    res.json({ message: "Settings saved successfully", settings });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});


// Paystack Payment Integration Endpoints

// 1. Initiate Payment
router.post("/payment/initiate", authenticateToken, async (req, res) => {
  try {
    const { planId } = req.body;
    if (!planId) return res.status(400).json({ error: "planId is required" });

    const dbUser = await User.findByPk(req.user.id);
    if (!dbUser) return res.status(404).json({ error: "User not found" });

    const plan = await SubscriptionPlan.findByPk(planId);
    if (!plan) return res.status(404).json({ error: "Subscription plan not found" });

    const paystackSecret = process.env.PAYSTACK_SECRET_KEY || "sk_test_placeholder_key";

    // Call Paystack Transaction Initialize API
    const paystackRes = await fetch("https://api.paystack.co/transaction/initialize", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${paystackSecret}`,
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        email: dbUser.email,
        amount: plan.amount * 100, // Convert plan amount (Naira) to kobo (smallest unit)
        currency: plan.currency || "NGN",
        callback_url: `${req.headers.origin || "http://localhost:3000"}/dashboard/billing`,
        metadata: {
          userId: req.user.id,
          planId: plan.id
        }
      })
    });

    const paystackData = await paystackRes.json();
    if (!paystackRes.ok || !paystackData.status) {
      return res.status(400).json({ error: paystackData.message || "Failed to initiate payment with Paystack" });
    }

    // Create an initiated PaymentHistory record
    const payment = await PaymentHistory.create({
      userId: req.user.id,
      provider: "paystack",
      amount: plan.amount,
      currency: plan.currency || "NGN",
      status: "initiated",
      reference: paystackData.data.reference
    });

    res.json({
      authorization_url: paystackData.data.authorization_url,
      reference: paystackData.data.reference,
      paymentId: payment.id
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Helper: Verify payment and activate subscription
async function verifyAndActivatePayment(reference) {
  const payment = await PaymentHistory.findOne({ where: { reference } });
  if (!payment) throw new Error("Payment record not found");

  // If already successful, skip
  if (payment.status === "successful") {
    return payment;
  }

  const paystackSecret = process.env.PAYSTACK_SECRET_KEY || "sk_test_placeholder_key";

  // Call Paystack Transaction Verify API
  const paystackRes = await fetch(`https://api.paystack.co/transaction/verify/${reference}`, {
    method: "GET",
    headers: {
      Authorization: `Bearer ${paystackSecret}`
    }
  });

  const paystackData = await paystackRes.json();
  if (!paystackRes.ok || !paystackData.status) {
    await payment.update({ status: "failed" });
    throw new Error(paystackData.message || "Failed to verify payment with Paystack");
  }

  const tx = paystackData.data;
  if (tx.status === "success") {
    const amount = Math.round(tx.amount / 100); // convert kobo to Naira
    // Update PaymentHistory status
    await payment.update({
      status: "successful",
      amount,
      paidAt: tx.paid_at ? new Date(tx.paid_at) : new Date()
    });

    // Update User subscription
    const userId = tx.metadata?.userId || payment.userId;
    const planId = tx.metadata?.planId;
    if (planId) {
      const plan = await SubscriptionPlan.findByPk(planId);
      if (plan) {
        const user = await User.findByPk(userId);
        if (user) {
          // Update or create active subscription
          let sub = await Subscription.findOne({ where: { id: user.subscriptionId } });
          if (!sub) {
            sub = await Subscription.create({
              plan: plan.name,
              targetEntity: "user",
              status: "active",
              planId: plan.id,
              limits: { maxChromeProfiles: plan.maxChromeProfiles, maxWebsites: plan.maxWebsites },
              endsAt: renewalDate()
            });
            await user.update({ subscriptionId: sub.id });
          } else {
            await sub.update({
              plan: plan.name,
              planId: plan.id,
              status: "active",
              limits: { maxChromeProfiles: plan.maxChromeProfiles, maxWebsites: plan.maxWebsites },
              endsAt: renewalDate()
            });
          }
          await logActivity(userId, "subscription_purchased", `Purchased subscription: ${plan.name}`, { planId: plan.id, amount });
        }
      }
    }
    return payment;
  } else {
    await payment.update({ status: "failed" });
    throw new Error("Transaction was not successful according to Paystack");
  }
}

// 2. Verify Payment (called by frontend to poll or update status to pending)
router.get("/payment/verify/:reference", authenticateToken, async (req, res) => {
  try {
    const { reference } = req.params;
    const payment = await PaymentHistory.findOne({ where: { reference } });
    if (!payment) return res.status(404).json({ error: "Payment record not found" });

    // Transition from initiated -> pending if the frontend hits this endpoint
    if (payment.status === "initiated") {
      await payment.update({ status: "pending" });
    }

    if (payment.status === "successful") {
      const user = await User.findByPk(payment.userId, {
        include: [{ model: Subscription, as: "subscription", include: [{ model: SubscriptionPlan, as: "planDetails" }] }]
      });
      const serializedSub = await serializeSubscription(user.subscription, user.role);
      return res.json({ status: "success", payment, subscription: serializedSub });
    }

    if (payment.status === "failed") {
      return res.json({ status: "failed", payment });
    }

    // Otherwise, it is "pending" (or we just switched it to pending)
    return res.json({ status: "pending", payment, message: "Payment is pending verification. Please wait." });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// 3. Webhook handler + verification (source of truth)
router.post("/payment/webhook", async (req, res) => {
  try {
    const signature = req.headers["x-paystack-signature"];
    if (!signature) {
      return res.status(400).send("Signature missing");
    }

    const paystackSecret = process.env.PAYSTACK_SECRET_KEY || "sk_test_placeholder_key";

    // Verify raw body signature
    const hash = crypto.createHmac("sha512", paystackSecret)
      .update(req.rawBody || JSON.stringify(req.body))
      .digest("hex");

    if (hash !== signature) {
      console.warn("[Webhook] Invalid signature detected");
      return res.status(401).send("Invalid signature");
    }

    const event = req.body;
    if (event.event === "charge.success") {
      const tx = event.data;
      const reference = tx.reference;

      console.log(`[Webhook] Received successful payment event for ref: ${reference}`);

      try {
        await verifyAndActivatePayment(reference);
        console.log(`[Webhook] Verification and activation successful for ref: ${reference}`);
      } catch (err) {
        console.error(`[Webhook] Verification/activation failed for ref ${reference}:`, err.message);
      }
    }

    res.status(200).send("Webhook received");
  } catch (error) {
    console.error("[Webhook Error]:", error.message);
    res.status(500).send("Internal Server Error");
  }
});

module.exports = router;
