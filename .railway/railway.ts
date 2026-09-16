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
const BROWSER_IMAGE = "Dockerfile.browser";
const BROWSER_SCRIPT = "scripts/browser-entrypoint.sh";
const APP_DATA_MOUNT = "/data";

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

  // One volume for every file the app writes: the agency logos and the phone screenshots. Larger
  // than it was, because a screenshot per run on a busy account adds up faster than logos do.
  const brandVolume = volume("brand-volume", { ...DB_VOLUME, sizeMB: 3000 });

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
      watchPatterns: ["**", `!${BROWSER_IMAGE}`, `!${BROWSER_SCRIPT}`],
    },
    deploy: {
      preDeployCommand: ["npm run db:migrate"],
      startCommand: "npm run start",
      healthcheckPath: "/api/health",
      healthcheckTimeout: 300,
      restartPolicyMaxRetries: 5,
    },
    volumeMounts: {
      [APP_DATA_MOUNT]: brandVolume,
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
      BRAND_DIR: preserve(),
      BROWSER_URL: preserve(),
      CSP_ENFORCE: preserve(),
      DATABASE_URL: preserve(),
      BILLING_RETURN_URL: preserve(),
      MERCADOPAGO_ACCESS_TOKEN: preserve(),
      MERCADOPAGO_WEBHOOK_SECRET: preserve(),
      NEXT_PUBLIC_APP_URL: preserve(),
      PAGESPEED_API_KEY: preserve(),
      PUPPETEER_SKIP_DOWNLOAD: preserve(),
      REDIS_URL: preserve(),
      SCREENSHOT_DIR: preserve(),
      SE_RANKING_API_KEY: preserve(),
    },
  });

  return project("Hunch", {
    resources: [
      app,
      redisDatabase,
      postgresDatabase,
      browser,
      postgresVolume,
      redisVolume,
      brandVolume,
    ],
  });
});
