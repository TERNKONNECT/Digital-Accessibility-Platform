const express = require("express");
const { Op } = require("sequelize");
const authenticateToken = require("../middleware/authenticate");
const {
  User,
  Subscription,
  SubscriptionPlan,
  ChromeIntegration,
  ChromeProfile,
  WidgetSite,
  PaymentHistory,
  ActivityLog,
} = require("../models");

const router = express.Router();

const DEFAULT_PLANS = [
  { name: "Starter", amount: 2900, maxChromeProfiles: 5, maxWebsites: 1 },
  { name: "Pro", amount: 7900, maxChromeProfiles: 25, maxWebsites: 10 },
  { name: "Enterprise", amount: 0, maxChromeProfiles: null, maxWebsites: null, billingCycle: "yearly" },
];

function code(prefix) {
  return `${prefix}-${Math.floor(100000 + Math.random() * 900000)}`;
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
  for (const plan of DEFAULT_PLANS) {
    await SubscriptionPlan.findOrCreate({
      where: { name: plan.name },
      defaults: { billingCycle: "monthly", chromeExtensionAccess: true, widgetAccess: true, status: "active", ...plan },
    });
  }
}

async function ensureSubscription(userId) {
  await ensurePlans();
  const user = await User.findByPk(userId, { include: [{ model: Subscription, as: "subscription", include: [{ model: SubscriptionPlan, as: "planDetails" }] }] });
  if (!user.subscription) {
    const starter = await SubscriptionPlan.findOne({ where: { name: "Starter" } });
    const subscription = await Subscription.create({
      plan: starter.name,
      targetEntity: "user",
      status: "active",
      planId: starter.id,
      limits: { maxChromeProfiles: starter.maxChromeProfiles, maxWebsites: starter.maxWebsites },
      endsAt: renewalDate(),
    });
    await user.update({ subscriptionId: subscription.id });
    await logActivity(userId, "subscription_created", "Starter subscription activated", { plan: "Starter" });
    return Subscription.findByPk(subscription.id, { include: [{ model: SubscriptionPlan, as: "planDetails" }] });
  }
  return user.subscription;
}

function serializeSubscription(subscription) {
  const plan = subscription?.planDetails;
  return {
    id: subscription?.id,
    planName: plan?.name || subscription?.plan || "Starter",
    status: subscription?.status || "active",
    price: plan?.amount || 0,
    currency: plan?.currency || "USD",
    billingCycle: plan?.billingCycle || "monthly",
    renewalDate: subscription?.endsAt,
    chromeExtensionAccess: plan?.chromeExtensionAccess ?? true,
    widgetAccess: plan?.widgetAccess ?? true,
    maxChromeProfiles: plan?.maxChromeProfiles ?? subscription?.limits?.maxChromeProfiles ?? 5,
    maxWebsites: plan?.maxWebsites ?? subscription?.limits?.maxWebsites ?? 1,
  };
}

async function getUserOverview(userId) {
  const subscription = await ensureSubscription(userId);
  const chromeIntegration = await ChromeIntegration.findOne({
    where: { userId },
    include: [{ model: ChromeProfile, as: "profiles", order: [["lastActiveAt", "DESC"]] }],
  });
  const websites = await WidgetSite.findAll({ where: { userId }, order: [["createdAt", "DESC"]] });
  const activities = await ActivityLog.findAll({ where: { userId }, order: [["createdAt", "DESC"]], limit: 12 });
  const payments = await PaymentHistory.findAll({ where: { userId }, order: [["createdAt", "DESC"]], limit: 12 });
  const plan = serializeSubscription(subscription);
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
    const existing = await ChromeIntegration.findOne({ where: { userId: req.user.id } });
    if (existing) return res.status(409).json({ error: "Chrome Extension integration already exists" });

    const integration = await ChromeIntegration.create({
      userId: req.user.id,
      name: req.body.name || "Chrome Extension Integration",
      integrationCode: code("ACCESS-EXT"),
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
    await integration.update({ integrationCode: code("ACCESS-EXT") });
    await logActivity(req.user.id, "integration_code_regenerated", "Chrome Extension integration code regenerated", { integrationId: integration.id });
    res.json(integration);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

router.post("/chrome/track", async (req, res) => {
  try {
    const { integrationCode, profileId, profileName, browserVersion, eventType } = req.body;
    const integration = await ChromeIntegration.findOne({ where: { integrationCode }, include: [{ model: User, as: "user" }] });
    if (!integration) return res.status(404).json({ error: "Invalid integration code" });

    const now = new Date();
    const [profile] = await ChromeProfile.findOrCreate({
      where: { chromeIntegrationId: integration.id, profileId },
      defaults: { chromeIntegrationId: integration.id, userId: integration.userId, profileId, profileName: profileName || "Chrome Profile", browserVersion, loginTime: now, firstSeenAt: now, lastActiveAt: now },
    });

    await profile.update({
      profileName: profileName || profile.profileName,
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

router.post("/widgets", authenticateToken, async (req, res) => {
  try {
    const widgetId = code("WIDGET");
    const integrationCode = code("ACCESS-WGT");
    const site = await WidgetSite.create({
      userId: req.user.id,
      websiteName: req.body.websiteName,
      websiteUrl: req.body.websiteUrl,
      widgetId,
      integrationCode,
      embedScript: `<script async src="https://cdn.ternkonnect.com/widget.js" data-widget-id="${widgetId}" data-integration-code="${integrationCode}"></script>`,
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
    const users = await User.findAll({
      where: userWhere,
      attributes: ["id", "name", "email", "role", "createdAt"],
      include: [
        { model: Subscription, as: "subscription", include: [{ model: SubscriptionPlan, as: "planDetails" }] },
        { model: ChromeIntegration, as: "chromeIntegration", include: [{ model: ChromeProfile, as: "profiles" }] },
        { model: WidgetSite, as: "widgetSites" },
      ],
      order: [["createdAt", "DESC"]],
    });
    const activeSubscriptions = await Subscription.count({ where: { status: "active" } });
    const payments = await PaymentHistory.findAll({ where: { status: "paid" } });
    const activeSince = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
    const activities = await ActivityLog.findAll({ where: { createdAt: { [Op.gte]: activeSince } } });

    res.json({
      totals: {
        totalUsers: users.length,
        activeUsers: new Set(activities.map((activity) => activity.userId)).size,
        activeSubscriptions,
        revenue: payments.reduce((sum, payment) => sum + payment.amount, 0),
        totalChromeProfiles: await ChromeProfile.count(),
        totalWebsites: await WidgetSite.count(),
        totalWidgetInstallations: await WidgetSite.count({ where: { status: "active" } }),
      },
      analytics: {
        dailyActiveUsers: new Set(activities.filter((activity) => activity.createdAt > new Date(Date.now() - 24 * 60 * 60 * 1000)).map((activity) => activity.userId)).size,
        monthlyActiveUsers: new Set(activities.map((activity) => activity.userId)).size,
        newSubscriptions: await Subscription.count({ where: { createdAt: { [Op.gte]: activeSince } } }),
        revenueGrowth: payments.reduce((sum, payment) => sum + payment.amount, 0),
        activeIntegrations: await ChromeIntegration.count({ where: { status: "active" } }),
        activeWebsites: await WidgetSite.count({ where: { status: "active" } }),
        widgetUsage: await WidgetSite.sum("usageCount"),
      },
      users,
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
    await plan.destroy();
    res.status(204).send();
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

module.exports = router;
