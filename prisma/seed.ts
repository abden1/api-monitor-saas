import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";

const db = new PrismaClient();

async function main() {
  console.log("Seeding database...");

  // Create demo user + team
  const passwordHash = await bcrypt.hash("password123", 12);

  const team = await db.team.upsert({
    where: { slug: "demo-team" },
    update: {},
    create: {
      name: "Demo Team",
      slug: "demo-team",
      plan: "PRO",
    },
  });

  const user = await db.user.upsert({
    where: { email: "demo@example.com" },
    update: {},
    create: {
      email: "demo@example.com",
      name: "Demo User",
      passwordHash,
      timezone: "UTC",
    },
  });

  await db.teamMember.upsert({
    where: { teamId_userId: { teamId: team.id, userId: user.id } },
    update: {},
    create: {
      teamId: team.id,
      userId: user.id,
      role: "OWNER",
    },
  });

  // Create demo monitors
  const monitors = await Promise.all([
    db.monitor.upsert({
      where: { id: "monitor-demo-1" },
      update: {},
      create: {
        id: "monitor-demo-1",
        teamId: team.id,
        name: "HTTPBin GET",
        url: "https://httpbin.org/get",
        type: "HTTP",
        method: "GET",
        expectedStatus: 200,
        interval: 60,
        timeout: 10,
        isActive: true,
        currentStatus: "UP",
        regions: ["us-east", "eu-west"],
      },
    }),
    db.monitor.upsert({
      where: { id: "monitor-demo-2" },
      update: {},
      create: {
        id: "monitor-demo-2",
        teamId: team.id,
        name: "Google DNS",
        url: "8.8.8.8",
        type: "PING",
        interval: 60,
        timeout: 5,
        isActive: true,
        currentStatus: "UP",
        regions: ["us-east"],
      },
    }),
    db.monitor.upsert({
      where: { id: "monitor-demo-3" },
      update: {},
      create: {
        id: "monitor-demo-3",
        teamId: team.id,
        name: "GitHub API",
        url: "https://api.github.com",
        type: "HTTP",
        method: "GET",
        expectedStatus: 200,
        interval: 120,
        timeout: 10,
        isActive: true,
        currentStatus: "UP",
        regions: ["us-east", "eu-west", "ap-southeast"],
      },
    }),
  ]);

  // Create demo status page
  const statusPage = await db.statusPage.upsert({
    where: { slug: "demo-status" },
    update: {},
    create: {
      teamId: team.id,
      title: "Demo Status Page",
      slug: "demo-status",
      brandColor: "#6366f1",
      isPublished: true,
      template: "LIGHT",
    },
  });

  // Create components for status page
  await Promise.all(
    monitors.map((monitor, i) =>
      db.statusPageComponent.upsert({
        where: { id: `spc-demo-${i + 1}` },
        update: {},
        create: {
          id: `spc-demo-${i + 1}`,
          statusPageId: statusPage.id,
          monitorId: monitor.id,
          name: monitor.name,
          groupName: "Services",
          displayOrder: i,
        },
      })
    )
  );

  console.log("Seed complete!");
  console.log("---");
  console.log("Demo login: demo@example.com / password123");
  console.log(`Status page: /status/demo-status`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => db.$disconnect());
