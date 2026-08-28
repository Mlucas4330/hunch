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
const BRANCH = "main";
const CRON_IMAGE = "Dockerfile.cron";
const CRON_SCRIPT = "scripts/cron-call.sh";
const BROWSER_IMAGE = "Dockerfile.browser";
const BROWSER_SCRIPT = "scripts/browser-entrypoint.sh";
const BROWSER_CDP_PORT = 9222;
const SCREENSHOT_MOUNT = "/data";

const cronService = (route: string, cronSchedule: string) => ({
  source: github(REPO, { branch: BRANCH }),
  build: {
    builder: "DOCKERFILE" as const,
    dockerfilePath: CRON_IMAGE,
    watchPatterns: [CRON_IMAGE, CRON_SCRIPT],
  },
  deploy: {
    startCommand: `/bin/sh /cron-call.sh ${route}`,
    cronSchedule,
    restartPolicyType: "NEVER" as const,
    numReplicas: 1,
  },
});

export default defineRailway(() => {
  const db = postgres("postgres");
  const cache = redis("redis");
  const screenshots = volume("screenshots");

  const browser = service("browser", {
    source: github(REPO, { branch: BRANCH }),
    build: {
      builder: "DOCKERFILE",
      dockerfilePath: BROWSER_IMAGE,
      watchPatterns: [BROWSER_IMAGE, BROWSER_SCRIPT],
    },
    deploy: {
      restartPolicyType: "ALWAYS",
      numReplicas: 1,
    },
  });

  const app = service("app", {
    source: github(REPO, { branch: BRANCH }),
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
    domains: [
      {
        domain: "hunch.solutions",
      },
    ],
    deploy: {
      preDeployCommand: ["npm run db:migrate"],
      startCommand: "npm run start",
      healthcheckPath: "/api/health",
      healthcheckTimeout: 300,
      restartPolicyType: "ON_FAILURE",
      restartPolicyMaxRetries: 5,
      numReplicas: 1,
    },
    volumeMounts: {
      [SCREENSHOT_MOUNT]: screenshots,
    },
    env: {
      DATABASE_URL: db.env.DATABASE_URL,
      REDIS_URL: cache.env.REDIS_URL,
      BROWSER_URL: `http://\${{ ${browser.name}.RAILWAY_PRIVATE_DOMAIN }}:${BROWSER_CDP_PORT}`,
      SCREENSHOT_DIR: `${SCREENSHOT_MOUNT}/screenshots`,
      AUTH_TRUST_HOST: "true",
      PUPPETEER_SKIP_DOWNLOAD: "true",
      AUTH_URL: preserve(),
      NEXT_PUBLIC_APP_URL: preserve(),
      AUTH_SECRET: preserve(),
      AUTH_GOOGLE_ID: preserve(),
      AUTH_GOOGLE_SECRET: preserve(),
      AUTH_GITHUB_ID: preserve(),
      AUTH_GITHUB_SECRET: preserve(),
      CRON_SECRET: preserve(),
      ADMIN_EMAIL: preserve(),
      CSP_ENFORCE: preserve(),
      ANTHROPIC_API_KEY: preserve(),
      STRIPE_SECRET_KEY: preserve(),
      STRIPE_WEBHOOK_SECRET: preserve(),
      STRIPE_PRICE_SINGLE: preserve(),
      STRIPE_PRICE_TRIO: preserve(),
      STRIPE_PRICE_PACK: preserve(),
      MERCADOPAGO_ACCESS_TOKEN: preserve(),
      NEXT_PUBLIC_MERCADOPAGO_PUBLIC_KEY: preserve(),
      MERCADOPAGO_WEBHOOK_SECRET: preserve(),
      NEXT_PUBLIC_SUPADEMO_DEMO_ID: preserve(),
      RESEND_API_KEY: preserve(),
      EMAIL_FROM: preserve(),
    },
  });

  const cronEnv = {
    CRON_SECRET: app.env.CRON_SECRET,
    APP_URL: `https://\${{ ${app.name}.RAILWAY_PUBLIC_DOMAIN }}`,
  };

  const cronPrune = service("cron-prune", {
    ...cronService("/api/cron/prune-screenshots", "0 9 * * *"),
    env: cronEnv,
  });

  const cronRemeasure = service("cron-remeasure", {
    ...cronService("/api/cron/remeasure", "0 7 * * 1"),
    env: cronEnv,
  });

  return project("hunch", {
    resources: [db, cache, screenshots, browser, app, cronPrune, cronRemeasure],
  });
});
