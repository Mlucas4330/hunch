import {
  ADS_CONVERSION_CURRENCY,
  ADS_CONVERSION_TIMEZONE,
  ADS_TOKEN_SAFETY_MARGIN_MS,
  ADS_UPLOAD_TIMEOUT_MS,
  GOOGLE_ADS_API_ORIGIN,
  GOOGLE_ADS_API_VERSION,
  GOOGLE_OAUTH_TOKEN_URL
} from '@/lib/constants'

/**
 * The Google Ads adapter, and the whole of what this app sends to Google.
 *
 * **Nothing is loaded from Google in a browser.** There is no gtag.js, no third-party cookie and no
 * consent banner, because the click id this reports was read out of our own query string by
 * middleware -- see GCLID_PARAM. What leaves the server is one click id, one amount and one
 * timestamp, per confirmed payment.
 *
 * Called over `fetch` rather than through `google-ads-api`, on exactly the reasoning in
 * lib/mercadopago.ts: what is needed is one token refresh and one POST, and the official client is a
 * large dependency with a code-generated surface for the rest of an API this will never touch.
 *
 * **Every function here fails soft and none of them throws.** The caller is a payment webhook whose
 * answer decides whether Mercado Pago retries the payment, and a conversion Google did not record is
 * a reporting gap. Letting it become a 500 would turn a reporting gap into a billing retry loop.
 */

const developerToken = process.env.GOOGLE_ADS_DEVELOPER_TOKEN
const customerId = process.env.GOOGLE_ADS_CUSTOMER_ID
const loginCustomerId = process.env.GOOGLE_ADS_LOGIN_CUSTOMER_ID
const conversionActionId = process.env.GOOGLE_ADS_CONVERSION_ACTION_ID
const leadConversionActionId = process.env.GOOGLE_ADS_LEAD_CONVERSION_ACTION_ID
const clientId = process.env.GOOGLE_ADS_CLIENT_ID
const clientSecret = process.env.GOOGLE_ADS_CLIENT_SECRET
const refreshToken = process.env.GOOGLE_ADS_REFRESH_TOKEN

/**
 * Whether a conversion can be reported at all.
 *
 * Six credentials, and a partial set is worse than none: it would produce a failed upload per
 * payment forever. Unset on every developer machine and in the e2e run, which is why the caller
 * treats `false` as "skip quietly" rather than as an error.
 */
export function googleAdsEnabled(): boolean {
  return Boolean(
    developerToken &&
      customerId &&
      conversionActionId &&
      clientId &&
      clientSecret &&
      refreshToken
  )
}

/**
 * Whether a captured lead can be reported as well.
 *
 * **A seventh variable, and deliberately not part of `googleAdsEnabled`.** Leaving it unset has to
 * mean "report payments and nothing else" rather than "report nothing": the payment upload is the
 * one that carries money and it must not go dark because a second conversion action was never
 * created. So this is the narrower gate, and it is checked on top of the six rather than beside
 * them.
 */
export function leadConversionEnabled(): boolean {
  return googleAdsEnabled() && Boolean(leadConversionActionId)
}

/** The conversion action a lead is reported against, empty when one was never configured. */
export function leadConversionAction(): string {
  return leadConversionActionId ?? ''
}

// Google's customer ids are written with dashes everywhere a human reads one and refused with them
// everywhere the API does. Normalised here so the env var can be pasted straight out of the UI.
function bareCustomerId(value: string): string {
  return value.replace(/-/g, '')
}

/** The account every call here writes to, normalised. */
export function adsAccount(): string {
  return bareCustomerId(customerId ?? '')
}

/**
 * The headers every Google Ads call needs, exported so a second caller cannot get one of them
 * subtly wrong.
 *
 * The one worth naming is `login-customer-id`: it is **omitted rather than blanked** when absent,
 * because an empty value is refused outright, and it may only name a manager the target account
 * actually sits under. Claiming a manager that is not above the account answers
 * `USER_PERMISSION_DENIED`, which reads exactly like a bad credential. See docs/ads.md.
 */
export async function adsHeaders(): Promise<Record<string, string>> {
  const token = await accessToken()

  return {
    Authorization: `Bearer ${token}`,
    'developer-token': developerToken ?? '',
    'Content-Type': 'application/json',
    ...(loginCustomerId ? { 'login-customer-id': bareCustomerId(loginCustomerId) } : {})
  }
}

/** Exported for the audience sync, which needs to prove the credentials before uploading anybody. */
export async function adsAccessToken(): Promise<string | null> {
  return accessToken()
}

let cachedToken: { value: string; expiresAt: number } | null = null

/**
 * A short-lived access token, exchanged from the long-lived refresh token.
 *
 * Cached in module memory because a token is good for an hour and a purchase is far rarer than that;
 * refreshing per conversion would spend two round trips where one does. The cache is per process and
 * losing it on a deploy costs one extra exchange.
 */
async function accessToken(): Promise<string | null> {
  if (cachedToken && cachedToken.expiresAt > Date.now()) return cachedToken.value

  const response = await fetch(GOOGLE_OAUTH_TOKEN_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      client_id: clientId ?? '',
      client_secret: clientSecret ?? '',
      refresh_token: refreshToken ?? '',
      grant_type: 'refresh_token'
    }),
    signal: AbortSignal.timeout(ADS_UPLOAD_TIMEOUT_MS)
  })

  if (!response.ok) {
    throw new Error(`google oauth answered ${response.status}: ${(await response.text().catch(() => '')).slice(0, 300)}`)
  }

  const json = (await response.json()) as { access_token?: string; expires_in?: number }
  if (!json.access_token) throw new Error('google oauth returned no access_token')

  cachedToken = {
    value: json.access_token,
    expiresAt: Date.now() + (json.expires_in ?? 3600) * 1000 - ADS_TOKEN_SAFETY_MARGIN_MS
  }

  return cachedToken.value
}

/**
 * Formats an instant the way `UploadClickConversions` demands: `yyyy-MM-dd HH:mm:ss+HH:mm`, in the
 * account's own timezone.
 *
 * Built from `Intl` parts rather than from `toISOString`, because an ISO string is UTC and the API
 * validates the offset against the account. Getting this wrong does not fail loudly -- it shifts
 * every conversion by three hours, which silently misattributes the ones near midnight.
 */
export function conversionDateTime(at: Date): string {
  const parts = new Intl.DateTimeFormat('en-CA', {
    timeZone: ADS_CONVERSION_TIMEZONE,
    hour12: false,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    timeZoneName: 'longOffset'
  }).formatToParts(at)

  const value = (type: Intl.DateTimeFormatPartTypes): string =>
    parts.find((part) => part.type === type)?.value ?? ''

  // `longOffset` renders as `GMT-03:00`, and `GMT` alone when the offset is zero.
  const offset = value('timeZoneName').replace('GMT', '') || '+00:00'

  // `hour` comes back as `24` at midnight under hour12: false in some runtimes, which the API
  // refuses. Normalising here is cheaper than discovering it once a day in production.
  const hour = value('hour') === '24' ? '00' : value('hour')

  return `${value('year')}-${value('month')}-${value('day')} ${hour}:${value('minute')}:${value('second')}${offset}`
}

export type ClickConversion = {
  gclid: string
  /**
   * What the buyer actually paid, in BRL. Never an estimate -- see docs/ads.md.
   *
   * **Absent for a lead, and that is the rule rather than an omission.** Nobody paid anything when
   * an address was left, so any figure here would be a number this code invented -- the expected
   * value of a lead is exactly the sort of quantity docs/invariants.md refuses on every other
   * surface, and our own reporting does not get an exemption. A conversion with no value is honest;
   * one carrying a guessed ticket is not.
   */
  valueBrl?: number
  /**
   * The payment's own id at the provider, or the lead's row id. Passed as Google's `orderId`, which
   * makes the upload idempotent on Google's side as well as on ours: a second upload carrying the
   * same order id updates the conversion rather than adding one.
   */
  orderId: string
  at: Date
  /** Which action to report against. Defaults to the purchase one when absent. */
  conversionActionId?: string
}

/**
 * Reports one conversion to Google Ads: a confirmed purchase, or a captured lead.
 *
 * **Throws on failure**, unlike everything the caller does with it -- the caller logs and swallows.
 * It is written this way so the failure carries a reason into the log line rather than becoming a
 * silent `false` that no one can diagnose.
 */
export async function uploadClickConversion(conversion: ClickConversion): Promise<void> {
  const token = await accessToken()
  const account = bareCustomerId(customerId ?? '')

  const response = await fetch(
    `${GOOGLE_ADS_API_ORIGIN}/${GOOGLE_ADS_API_VERSION}/customers/${account}:uploadClickConversions`,
    {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${token}`,
        'developer-token': developerToken ?? '',
        'Content-Type': 'application/json',
        // Only present when the credentials belong to a manager account above the one being
        // written to. Sending it empty is refused, so the header is omitted rather than blanked.
        ...(loginCustomerId ? { 'login-customer-id': bareCustomerId(loginCustomerId) } : {})
      },
      body: JSON.stringify({
        conversions: [
          {
            gclid: conversion.gclid,
            conversionAction: `customers/${account}/conversionActions/${conversion.conversionActionId ?? conversionActionId}`,
            conversionDateTime: conversionDateTime(conversion.at),
            // Omitted together, rather than sent as a zero: a currency with no amount beside it is
            // refused, and a zero would claim a sale worth nothing rather than a conversion that
            // never had a price.
            ...(conversion.valueBrl === undefined
              ? {}
              : { conversionValue: conversion.valueBrl, currencyCode: ADS_CONVERSION_CURRENCY }),
            orderId: conversion.orderId
          }
        ],
        // Google validates the whole batch and reports per-row errors rather than refusing the
        // request, so a partial failure has to be read out of the response body below.
        partialFailure: true
      }),
      signal: AbortSignal.timeout(ADS_UPLOAD_TIMEOUT_MS)
    }
  )

  if (!response.ok) {
    throw new Error(
      `google ads upload answered ${response.status}: ${(await response.text().catch(() => '')).slice(0, 500)}`
    )
  }

  // A 200 with a `partialFailureError` is a rejected conversion wearing a success status, and it is
  // the shape every real failure takes here: an expired click, an unknown conversion action, a gclid
  // that belongs to another account. Reading it is the difference between "reported" and "believed
  // reported".
  const json = (await response.json()) as { partialFailureError?: { message?: string } }

  if (json.partialFailureError) {
    throw new Error(`google ads rejected the conversion: ${json.partialFailureError.message ?? 'no message'}`)
  }
}
