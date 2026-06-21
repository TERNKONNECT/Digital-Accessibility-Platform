const bcrypt = require("bcryptjs");
const { sequelize, User, Subscription, SubscriptionPlan } = require("./models");

async function seedDatabase() {
  console.log("Starting database seeding...");
  
  try {
    // Sync the database first (makes sure tables exist)
    await sequelize.sync();
    console.log("Database tables synced.");

    const hashedPassword = await bcrypt.hash("Password123", 10);

    const defaultUsers = [
      {
        name: "Regular User",
        email: "user@ternkonnect.com",
        password: hashedPassword,
        role: "solo",
        emailVerified: true,
        status: "active",
      },
      {
        name: "Super Admin",
        email: "admin@ternkonnect.com",
        password: hashedPassword,
        role: "superadmin",
        emailVerified: true,
        status: "active",
      },
      {
        name: "Org Admin",
        email: "orgadmin@ternkonnect.com",
        password: hashedPassword,
        role: "org_admin",
        emailVerified: true,
        status: "active",
      },
    ];

    for (const userData of defaultUsers) {
      const [user, created] = await User.findOrCreate({
        where: { email: userData.email },
        defaults: userData,
      });

      if (created) {
        console.log(`Successfully created user: ${userData.name} (${userData.email}) with role: ${userData.role}`);
      } else {
        console.log(`User already exists: ${userData.name} (${userData.email})`);
      }
    }

    // Seed default plans if not present
    const planCount = await SubscriptionPlan.count();
    if (planCount === 0) {
      const DEFAULT_PLANS = [
        { name: "Starter", amount: 29, maxChromeProfiles: 5, maxWebsites: 1, currency: "NGN", status: "active" },
        { name: "Pro", amount: 79, maxChromeProfiles: 25, maxWebsites: 10, currency: "NGN", status: "active" },
        { name: "Enterprise", amount: 0, maxChromeProfiles: null, maxWebsites: null, billingCycle: "yearly", currency: "NGN", status: "active" },
      ];
      for (const p of DEFAULT_PLANS) {
        await SubscriptionPlan.create({ ...p, billingCycle: p.billingCycle || "monthly" });
      }
      console.log("Default plans seeded.");
    }

    const starterPlan = await SubscriptionPlan.findOne({ where: { name: "Starter", status: "active" } });
    const proPlan = await SubscriptionPlan.findOne({ where: { name: "Pro", status: "active" } });

    // Seed 15 Active Subscriptions
    const subCount = await Subscription.count();
    if (subCount < 15) {
      console.log(`Seeding mock subscriptions (current count: ${subCount})...`);
      for (let i = subCount + 1; i <= 15; i++) {
        const dummyEmail = `testuser${i}@ternkonnect.com`;
        const dummyName = `Test User ${i}`;
        
        // Create user
        const [dummyUser] = await User.findOrCreate({
          where: { email: dummyEmail },
          defaults: {
            name: dummyName,
            email: dummyEmail,
            password: hashedPassword,
            role: "solo",
            emailVerified: true,
            status: "active"
          }
        });

        // Associate with an active subscription
        if (!dummyUser.subscriptionId) {
          const chosenPlan = i % 2 === 0 ? proPlan : starterPlan;
          if (chosenPlan) {
            const endsAt = new Date();
            endsAt.setMonth(endsAt.getMonth() + 1);

            const sub = await Subscription.create({
              plan: chosenPlan.name,
              targetEntity: "user",
              status: "active",
              planId: chosenPlan.id,
              limits: { maxChromeProfiles: chosenPlan.maxChromeProfiles, maxWebsites: chosenPlan.maxWebsites },
              endsAt
            });
            await dummyUser.update({ subscriptionId: sub.id });
          }
        }
      }
      console.log("15 Active Subscriptions seeded successfully.");
    }

    console.log("Database seeding completed successfully.");
  } catch (error) {
    console.error("Error during database seeding:", error);
    throw error;
  }
}

// Run the script directly if invoked from command line
if (require.main === module) {
  seedDatabase()
    .then(() => {
      process.exit(0);
    })
    .catch((err) => {
      process.exit(1);
    });
}

module.exports = seedDatabase;
