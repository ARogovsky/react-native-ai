/**
 * Static guard against shipping the wrong Clerk instance in a build profile.
 *
 * Why: a dev publishable key once sat next to a live secret key on the API, and the e2e
 * profiles deliberately carry a DEV key so Clerk's +clerk_test/424242 login works. If such
 * a profile reaches a store submit, users get an instance whose tokens the production API
 * rejects.
 *
 * Rules (reads eas.json only, no network):
 *   1. Any EXPO_PUBLIC_CLERK_PUBLISHABLE_KEY must decode to a known Clerk host.
 *   2. Profiles named e2e* must use the DEV instance (the test OTP exists only there).
 *   3. Every other profile must use the LIVE instance, or not pin the key at all
 *      (then it comes from the EAS environment).
 *   4. No submit profile may be named after an e2e build profile.
 */

const fs = require('fs');
const path = require('path');

const LIVE_HOST = 'clerk.e-lli.com';
const DEV_HOST = 'neat-baboon-42.clerk.accounts.dev';
const KEY = 'EXPO_PUBLIC_CLERK_PUBLISHABLE_KEY';

function decodeHost(key) {
  const parts = String(key).split('_');
  if (parts.length < 3 || parts[0] !== 'pk' || !['test', 'live'].includes(parts[1])) {
    return null;
  }
  try {
    return Buffer.from(parts.slice(2).join('_'), 'base64').toString('utf8').replace(/\$$/, '');
  } catch (e) {
    return null;
  }
}

function check(easJsonPath) {
  const eas = JSON.parse(fs.readFileSync(easJsonPath, 'utf8'));
  const problems = [];

  for (const [name, profile] of Object.entries(eas.build || {})) {
    const key = ((profile.env || {})[KEY]) || null;
    const isE2e = name.startsWith('e2e');

    if (!key) {
      if (isE2e) {
        problems.push('profile "' + name + '": must pin ' + KEY + ' to the dev instance');
      }
      continue;
    }

    const host = decodeHost(key);
    if (!host) {
      problems.push('profile "' + name + '": ' + KEY + ' is not a decodable pk_test_/pk_live_ key');
    } else if (host !== LIVE_HOST && host !== DEV_HOST) {
      problems.push('profile "' + name + '": unknown Clerk host "' + host + '"');
    } else if (isE2e && host !== DEV_HOST) {
      problems.push('profile "' + name + '": e2e needs ' + DEV_HOST + ', got ' + host);
    } else if (!isE2e && host !== LIVE_HOST) {
      problems.push('profile "' + name + '": must use ' + LIVE_HOST + ', got ' + host);
    }
  }

  for (const name of Object.keys(eas.submit || {})) {
    if (name.startsWith('e2e')) {
      problems.push('submit profile "' + name + '": e2e builds must never reach a store');
    }
  }

  return problems;
}

module.exports = { check, decodeHost, LIVE_HOST, DEV_HOST };

if (require.main === module) {
  const target = process.argv[2] || path.join(__dirname, '..', 'eas.json');
  const problems = check(target);
  if (problems.length) {
    console.error('Clerk key check FAILED:');
    for (const problem of problems) console.error(' -', problem);
    process.exit(1);
  }
  console.log('Clerk key check passed for', target);
}
