/**
 * Legal document URLs.
 *
 * Read from the Clerk instance itself (GET https://clerk.e-lli.com/v1/environment,
 * display_config.terms_url / display_config.privacy_policy_url) so the app links to the
 * same documents the instance is configured with.
 */
export const legalUrls = {
  terms: 'https://e-lli.com/user-agreement-eng',
  privacy: 'https://e-lli.com/privacy-policy-eng',
} as const
