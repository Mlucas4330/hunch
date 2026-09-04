import {
  defineRailway,
  github,
  postgres,
  preserve,
  project,
  redis,
  service,
  volume,
} from "railway/iac";

const REPO = "Mlucas4330/hunch";
const REGION = "us-west2";
const DOMAIN = "hunch.solutions";
const CRON_IMAGE = "Dockerfile.cron";
const CRON_SCRIPT = "scripts/cron-call.sh";
const BROWSER_IMAGE = "Dockerfile.browser";
const BROWSER_SCRIPT = "scripts/browser-entrypoint.sh";

const DB_VOLUME = {
  alerts: { usage: { "80": {}, "95": {}, "100": {} } },
  allowOnlineResize: true,
  region: REGION,
  sizeMB: 5000,
};

export default defineRailway(() => {
  const source = github(REPO, { checkSuites: false });

  const postgresDatabase = postgres("postgres", { region: REGION });
  const postgresVolume = volume("postgres-volume", DB_VOLUME);

  const redisDatabase = redis("redis", { region: REGION });
  redisDatabase.deploy = {
    startCommand:
      '/bin/sh -c "rm -rf $RAILWAY_VOLUME_MOUNT_PATH/lost+found/ && exec docker-entrypoint.sh redis-server --requirepass $REDIS_PASSWORD --save 60 1 --dir $RAILWAY_VOLUME_MOUNT_PATH"',
  };
  const redisVolume = volume("redis-volume", DB_VOLUME);

  const screenshots = volume("screenshots", DB_VOLUME);

  const browser = service("browser", {
    source,
    replicas: { [REGION]: 1 },
    build: {
      builder: "DOCKERFILE",
      dockerfilePath: BROWSER_IMAGE,
      watchPatterns: [BROWSER_IMAGE, BROWSER_SCRIPT],
    },
    deploy: {
      restartPolicyType: "ALWAYS",
    },
  });

  const app = service("app", {
    source,
    replicas: { [REGION]: 1 },
    domains: [DOMAIN],
    networking: { privateNetworkEndpoint: "hunch" },
    build: {
      builder: "RAILPACK",
      watchPatterns: [
        "**",
        `!${BROWSER_IMAGE}`,
        `!${CRON_IMAGE}`,
        `!${CRON_SCRIPT}`,
        `!${BROWSER_SCRIPT}`,
      ],
    },
    deploy: {
      preDeployCommand: ["npm run db:migrate"],
      startCommand: "npm run start",
      healthcheckPath: "/api/health",
      healthcheckTimeout: 300,
      restartPolicyMaxRetries: 5,
    },
    volumeMounts: {
      "/data": screenshots,
    },
    env: {
      ADMIN_EMAIL: preserve(),
      ANTHROPIC_API_KEY: preserve(),
      AUTH_GITHUB_ID: preserve(),
      AUTH_GITHUB_SECRET: preserve(),
      AUTH_GOOGLE_ID: preserve(),
      AUTH_GOOGLE_SECRET: preserve(),
      AUTH_SECRET: preserve(),
      AUTH_TRUST_HOST: preserve(),
      AUTH_URL: preserve(),
      BROWSER_URL: preserve(),
      CRON_SECRET: preserve(),
      CSP_ENFORCE: preserve(),
      DATABASE_URL: preserve(),
      MERCADOPAGO_ACCESS_TOKEN: preserve(),
      MERCADOPAGO_WEBHOOK_SECRET: preserve(),
      NEXT_PUBLIC_APP_URL: preserve(),
      NEXT_PUBLIC_MERCADOPAGO_PUBLIC_KEY: preserve(),
      NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY: preserve(),
      NEXT_PUBLIC_SUPADEMO_DEMO_ID: preserve(),
      PUPPETEER_SKIP_DOWNLOAD: preserve(),
      REDIS_URL: preserve(),
      SCREENSHOT_DIR: preserve(),
      STRIPE_PRICE_SINGLE: preserve(),
      STRIPE_PRICE_TRIO: preserve(),
      STRIPE_SECRET_KEY: preserve(),
      STRIPE_WEBHOOK_SECRET: preserve(),
    },
  });

  const cronEnv = {
    APP_URL: preserve(),
    CRON_SECRET: app.env.CRON_SECRET,
  };

  const cron = (name: string, route: string, cronSchedule: string) =>
    service(name, {
      source,
      replicas: { [REGION]: 1 },
      build: {
        builder: "DOCKERFILE",
        dockerfilePath: CRON_IMAGE,
        watchPatterns: [CRON_IMAGE, CRON_SCRIPT],
      },
      deploy: {
        startCommand: `/bin/sh /cron-call.sh ${route}`,
        cronSchedule,
        restartPolicyType: "NEVER",
      },
      env: cronEnv,
    });

  const cronPrune = cron("cron-prune", "/api/cron/prune-screenshots", "0 9 * * *");

  // Staggered rather than all at 09:00: three services waking together against one app instance is
  // a self-inflicted burst, and none of these is urgent to the minute.
  //
  // The lead sequence is idempotent on `leads.stage`, and the audience sync replaces a whole list,
  // so a missed run costs a day rather than anything permanent. The pending-payment reminder is the
  // one to leave alone: its idempotency is the window it looks at, so moving it to a schedule that
  // fires twice a day would mail the same person twice. See docs/api.md.
  const cronLeadSequence = cron("cron-lead-sequence", "/api/cron/lead-sequence", "0 12 * * *");
  const cronPendingPayments = cron("cron-pending-payments", "/api/cron/pending-payments", "0 15 * * *");
  const cronAudienceSync = cron("cron-audience-sync", "/api/cron/audience-sync", "0 6 * * *");

  return project("Hunch", {
    resources: [
      app,
      redisDatabase,
      postgresDatabase,
      cronPrune,
      cronLeadSequence,
      cronPendingPayments,
      cronAudienceSync,
      browser,
      postgresVolume,
      redisVolume,
      screenshots,
    ],
  });
});
