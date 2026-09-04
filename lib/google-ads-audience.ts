import { createHash } from 'node:crypto'
import {
  AUDIENCE_BATCH_SIZE,
  AUDIENCE_LISTS,
  GOOGLE_ADS_API_ORIGIN,
  GOOGLE_ADS_API_VERSION
} from '@/lib/constants'
import { adsAccessToken, adsAccount, adsHeaders, googleAdsEnabled } from '@/lib/google-ads'

/**
 * Customer Match: the audiences this product sends to Google, and the whole of what goes.
 *
 * **No tag, no pixel, no cookie.** The audience is built from addresses people gave us, hashed here
 * and uploaded from the server, which is the same shape as the conversion upload next door. Nothing
 * is loaded from Google in a browser, and that decision in docs/ads.md is untouched by this.
 *
 * **What leaves is a SHA-256 digest and never an address.** `normalize` lowercases and trims first
 * because Google hashes the same way on their side, and a digest of " Foo@Bar.com " matches nothing.
 *
 * **Only rows with `leads.consented_at` reach here.** The form that collected an address before that
 * column existed promised one mail and nothing else, and this is exactly the use that promise ruled
 * out. The caller does the filtering; this module refuses to be the place where that rule is
 * remembered rather than enforced. See docs/ads.md.
 *
 * Every function fails soft and none of them throws at the caller: a list that stopped growing is a
 * targeting gap, and it must never become a failed cron that hides the ones that matter.
 */

export type AudienceList = keyof typeof AUDIENCE_LISTS

/**
 * Google's own normalisation, and it is not optional: they hash the address the same way before
 * matching, so any difference here is a member that silently never matches anybody.
 */
export function hashEmail(email: string): string {
  return createHash('sha256').update(email.trim().toLowerCase()).digest('hex')
}

export function audienceEnabled(): boolean {
  return googleAdsEnabled()
}

type SearchResponse<T> = { results?: T[] }

async function call<T>(path: string, body: unknown): Promise<T> {
  const account = adsAccount()
  const response = await fetch(
    `${GOOGLE_ADS_API_ORIGIN}/${GOOGLE_ADS_API_VERSION}/customers/${account}${path}`,
    {
      method: 'POST',
      headers: await adsHeaders(),
      body: JSON.stringify(body)
    }
  )

  const text = await response.text()
  if (!response.ok) {
    throw new Error(`${path} answered ${response.status}: ${text.slice(0, 300)}`)
  }
  return JSON.parse(text) as T
}

/**
 * The list's resource name, creating it the first time.
 *
 * `CRM_BASED` with `CONTACT_INFO` upload: a list fed by hashed contact details rather than by a tag
 * watching a browser. The membership life span is Google's maximum, because a lead who read their
 * report six months ago is exactly who this list is for.
 */
export async function ensureList(list: AudienceList): Promise<string> {
  const name = AUDIENCE_LISTS[list]
  const account = adsAccount()

  const found = await call<SearchResponse<{ userList: { resourceName: string } }>>(
    '/googleAds:search',
    {
      query: `SELECT user_list.resource_name FROM user_list WHERE user_list.name = '${name}'`
    }
  )

  const existing = found.results?.[0]?.userList.resourceName
  if (existing) return existing

  const created = await call<{ results?: { resourceName: string }[] }>('/userLists:mutate', {
    operations: [
      {
        create: {
          name,
          membershipLifeSpan: '10000',
          crmBasedUserList: {
            uploadKeyType: 'CONTACT_INFO',
            dataSourceType: 'FIRST_PARTY'
          }
        }
      }
    ]
  })

  const resource = created.results?.[0]?.resourceName
  if (!resource) throw new Error(`user list "${name}" was neither found nor created`)
  return `customers/${account}/userLists/${resource.split('/').pop()}`
}

/**
 * Replaces a list's membership with exactly these addresses.
 *
 * `REMOVE_ALL` first, so somebody who unsubscribed or asked to be forgotten leaves the audience on
 * the next run rather than staying in it until Google's own expiry. The alternative, adding only
 * what is new, means the only way out of the list is a deletion nobody would remember to write.
 */
export async function syncAudience(list: AudienceList, emails: string[]): Promise<number> {
  const userList = await ensureList(list)

  const job = await call<{ resourceName: string }>('/offlineUserDataJobs:create', {
    job: {
      type: 'CUSTOMER_MATCH_USER_LIST',
      customerMatchUserListMetadata: { userList }
    }
  })

  const jobPath = `/${job.resourceName.split('/').slice(2).join('/')}`

  const unique = [...new Set(emails.map(hashEmail))]

  for (let index = 0; index < unique.length; index += AUDIENCE_BATCH_SIZE) {
    const batch = unique.slice(index, index + AUDIENCE_BATCH_SIZE)

    await call(`${jobPath}:addOperations`, {
      enablePartialFailure: true,
      operations: batch.map((hashedEmail) => ({ create: { userIdentifiers: [{ hashedEmail }] } })),
      // Cleared once, on the first batch, so a job that is still being filled never serves a
      // half-empty list.
      ...(index === 0 ? { enableWarnings: true } : {})
    })
  }

  await call(`${jobPath}:run`, {})

  return unique.length
}

/**
 * A dry run that proves the credentials, the list and the job shape without uploading anybody.
 *
 * Worth having because the failure modes here are all silent: a wrong list type, a job that is never
 * run, a digest computed over an address nobody normalised. None of those raise anything a person
 * would notice, and all of them produce an audience of zero.
 */
export async function verifyAudience(list: AudienceList): Promise<string> {
  if (!audienceEnabled()) throw new Error('google ads is not configured')
  await adsAccessToken()
  return ensureList(list)
}
