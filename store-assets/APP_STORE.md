# Ask AI Buddha — App Store

The iOS app is a Capacitor shell. It loads the live site (by default `https://ask-buddha.vercel.app`, or `CAPACITOR_SERVER_URL` / `NEXT_PUBLIC_SITE_URL` when set) and sells messages only through Apple In-App Purchase. The website keeps the free daily limit and the optional `NEXT_PUBLIC_SUPPORT_URL` link. That link is not shown in the iOS app. The website has no checkout and does not use Stripe. Android uses the same prices with shorter product IDs, listed in `store-assets/PLAY_STORE.md`.

The App Store Connect app does not exist yet. Do not run `.github/workflows/ios-testflight.yml` until the record, the products, and the signing secrets exist. The workflow is manual only (`workflow_dispatch`).

## Listing

| Field | Value |
| --- | --- |
| Name | Ask AI Buddha |
| Home screen name | Ask Buddha |
| Apple ID | Assigned when the app record is created. Put that number in `APPLE_APP_APPLE_ID`. |
| Team ID | `9W7P7999LL` |
| Subtitle | A quiet talk with the Dhamma (28 characters) |
| Bundle ID | `com.starseedsquad.askbuddha` |
| SKU | `ask-buddha-ai` |
| Primary category | Lifestyle |
| Secondary category | Reference (not Books; this is a conversation, not a book) |
| Privacy policy URL | `https://ask-buddha.vercel.app/privacy` |
| Terms URL | `https://ask-buddha.vercel.app/terms` |
| Support URL | `https://ask-buddha.vercel.app/about` |
| Marketing URL | `https://ask-buddha.vercel.app` |
| Copyright | 2026, using the legal name on the Apple Developer account |
| Price | Free, with in-app purchases |
| Age rating | Answer the questionnaire below. Expected result is 4+, not the Kids category. |

Replace `https://ask-buddha.vercel.app` with the real production URL if Vercel assigns a different host. Set `NEXT_PUBLIC_SITE_URL` to that host.

### Description

Ask AI Buddha is a quiet place to talk. You write what is on your mind. The reply is short, in the first person, grounded in Theravada Buddhism and the Pali Canon. When it quotes scripture, it quotes the Sutta Pitaka, with a citation.

Ten messages a day are free. On this iOS app, Unlimited today opens the rest of the day for $0.99, and a monthly subscription keeps every day open for $6.99. Those are purchased from Apple, inside the app. A day pass or subscription includes 300 messages each UTC day.

This is not the Buddha, and it is not scripture. It is not a teacher in your community, a doctor, or a counselor. If you may be in danger, the app points you to real help, including 988 in the United States.

Privacy policy: https://ask-buddha.vercel.app/privacy
Terms of use: https://ask-buddha.vercel.app/terms

### Keywords

`buddhism,dharma,meditation,mindfulness,sutta,dhamma,peace,compassion,theravada,pali`

83 characters. No spaces. The words in the name (Ask, AI, Buddha) and the subtitle (quiet, talk, Dhamma) are left out, because App Store Connect already indexes those.

### Promotional text

Ten free messages a day. Unlimited today is $0.99. A month is $6.99.

68 characters. The limit is 170. This can be changed later without a new build.

### App Review notes

Paste this into the version’s Review Notes:

```
Ask AI Buddha is an AI. It is not a person, not the Buddha, and not scripture. No account is required.

Ten messages each UTC day are free. In the iOS app, tap Support, or send 10 messages, to open the paywall. Unlimited today is a $0.99 consumable for the rest of that UTC day. Monthly is a $6.99 auto-renewable subscription, one month, renewing until canceled in Settings. Each includes a fair-use cap of 300 messages per UTC day. Payment stays inside Apple.

Privacy: https://ask-buddha.vercel.app/privacy
Terms: https://ask-buddha.vercel.app/terms

Sandbox: sign in with the Sandbox Apple ID attached to this review. Buy either product from the paywall. A day pass changes the footer to UNLIMITED MESSAGES ACTIVATED. A subscription changes it to MONTHLY UNLIMITED ACTIVATED. Restore Purchases puts an active subscription back on the device.

Hidden tester tools exist for the developer only. They are not needed for review. Please do not look for them.
```

### Age rating notes

Answer the current App Store Connect questionnaire this way. The form no longer uses a manual 12+ choice. These answers should calculate to 4+. Do not put the app in the Kids category. The privacy policy says it is not directed to children under 13.

- Cartoon or fantasy violence, realistic violence, guns or other weapons: None.
- Sexual content, nudity, mature or suggestive themes: None.
- Profanity or crude humor, horror or fear themes: None.
- Alcohol, tobacco, or drugs: None.
- Gambling, simulated gambling, contests, loot boxes: None.
- Medical or treatment information: None. It refuses medical advice and tells a person in an emergency to call for help. Health or wellness topics: No.
- Unrestricted web access: No. The shell opens this app’s own site. Links to crisis lines and the legal pages open in Safari.
- User-generated content: No. Someone types a private message to the AI. It is not posted, shared, or shown to anyone else. There is no feed.
- Social media: No. Nothing is redistributed or amplified to other people. There is no “disabled for users under 13” path, because there is no social feature.
- Messaging and chat: No, if the question means chat with other people. The only reply is from the AI on this device.
- Advertising: No.
- Parental controls, age assurance: No.
- Made for Kids: No.

### App Privacy answers

- Data used to track you: none.
- User content: the words someone types are sent to the server and then to OpenAI to write the reply. They are not stored on the server, and they are not linked to an identity.
- Purchases: Apple processes payment. The server checks a signed transaction and keeps the unlock on the device, as a signed token and a cookie. It is not an account.
- Identifiers, contacts, location, and advertising data: not collected.

## Products

Create these in App Store Connect with these exact product IDs and prices. The app shows the price Apple returns for the person’s storefront, and falls back to these amounts if StoreKit has not answered yet.

Subscription group reference name: `Ask AI Buddha Unlimited`

| Product ID | Type | Price | What it unlocks | Reference name |
| --- | --- | --- | --- | --- |
| `com.starseedsquad.askbuddha.unlimited.today` | Consumable | $0.99 | Messages until midnight UTC on the day it is bought, up to 300 that day | Unlimited today |
| `com.starseedsquad.askbuddha.unlimited.monthly` | Auto-renewable subscription, 1 month | $6.99 | Messages until the period ends, up to 300 each UTC day | Monthly |

Display name for the consumable: `Unlimited today`
Consumable description: `Messages until midnight UTC on the day you buy it, up to 300 that day.`

Subscription display name: `Monthly`
Subscription description: `Messages with Ask AI Buddha until you cancel, up to 300 each day.`

Family Sharing should be off.

A day is the same UTC day the free limit uses. Unlimited today bought at 11pm UTC lasts until midnight UTC.

## Server environment

Set these on the host that serves the website (Vercel), not in the iOS binary. The free website keeps working if they are empty. A purchase is remembered only after `UNLOCK_COOKIE_SECRET` is set. StoreKit receipts are checked locally against Apple Root CA G3, so the In-App Purchase API key is optional.

| Variable | Purpose |
| --- | --- |
| `APPLE_IAP_KEY_ID` | Optional. Key ID of an In-App Purchase key. When set with the issuer and private key, the server also confirms the transaction with the App Store Server API. |
| `APPLE_IAP_ISSUER_ID` | Optional. Issuer ID for that key. |
| `APPLE_IAP_PRIVATE_KEY` | Optional. Contents of that key’s `.p8` file, including the BEGIN and END lines. Escaped newlines (`\n`) are accepted. |
| `APPLE_BUNDLE_ID` | Optional. Defaults to `com.starseedsquad.askbuddha`. |
| `APPLE_APP_APPLE_ID` | Numeric Apple ID of Ask AI Buddha, after the app record exists. Required to confirm production transactions. TestFlight uses the sandbox, which does not need it. |
| `APPLE_IAP_ONLINE_CHECKS` | Optional. `true` also checks certificate revocation. |
| `UNLOCK_COOKIE_SECRET` | Required for purchases. A long random string. It signs the unlock token and the cookie that remember a verified unlock. Do not commit it. |
| `UNLIMITED_DAILY_CAP` | Optional. Fair-use cap for a day pass or subscription, per UTC day. Defaults to `300`. |
| `MAX_OUTPUT_TOKENS` | Optional. Maximum tokens generated for one reply. Defaults to `420`. |

The server verifies the StoreKit 2 signed transaction (JWS) against Apple Root CA G3 for both Sandbox and Production. It checks the bundle ID, product ID, and expiry. When the In-App Purchase API key is set, it also asks the App Store Server API. A consumable grants access until the end of its purchase day. A subscription grants access until Apple’s expiry, including a billing grace period. A refunded transaction does not grant access.

## GitHub secrets

The workflow `.github/workflows/ios-testflight.yml` is manual (`workflow_dispatch` only). Run it from the `main` branch after the secrets below are set and the App Store app exists. It does not run on push.

| Secret | Required | What to paste |
| --- | --- | --- |
| `ASC_KEY_ID` | Yes | Key ID of an App Store Connect API key with the Admin role. |
| `ASC_ISSUER_ID` | Yes | Issuer ID shown above the keys list. |
| `ASC_PRIVATE_KEY` | Yes | The full `.p8` file for that key, or the same file encoded as base64. |
| `APPLE_TEAM_ID` | Yes | Team ID `9W7P7999LL`. Automatic signing cannot create a profile without it. |
| `CAPACITOR_SERVER_URL` | No | Site the shell should load. When empty, the app loads `https://ask-buddha.vercel.app`. |

`ASC_PRIVATE_KEY` is for building and uploading. `APPLE_IAP_PRIVATE_KEY` is optional and only used when the server should also call the App Store Server API. Receipt checks do not need it.

## Icon

The App Store icon is `store-assets/ask-buddha-ios-1024.png`, copied into the iOS asset catalog. It is the opaque 1024 portrait, without rounded corners.

## Screenshots

Not captured yet. The App Store app and the production site do not exist, so this repo does not include store screenshots. Capture them from the live site in an iPhone-sized browser, with the iOS shell behavior (the Support paywall, and the day-pass footer). There should be no status bar and no tester UI. The portrait already meets the top edge, so these should be full-bleed and should not add a caption band.

Upload the 6.9-inch set and the 6.5-inch set on the version page, in this order:

| File | Size | What it shows |
| --- | --- | --- |
| `store-assets/screenshots/iphone-6.9-1320x2868-greeting.png` | 1320×2868 | Opening line: “Friend, what is on your mind today?” |
| `store-assets/screenshots/iphone-6.9-1320x2868-sutta.png` | 1320×2868 | A short conversation with Dhammapada 1:5 in jade italic |
| `store-assets/screenshots/iphone-6.9-1320x2868-paywall.png` | 1320×2868 | Unlimited today $0.99 and Monthly $6.99/month |
| `store-assets/screenshots/iphone-6.9-1320x2868-unlimited.png` | 1320×2868 | Footer: UNLIMITED MESSAGES ACTIVATED |
| `store-assets/screenshots/iphone-6.5-1242x2688-greeting.png` | 1242×2688 | Same opening screen |
| `store-assets/screenshots/iphone-6.5-1242x2688-sutta.png` | 1242×2688 | Same conversation |
| `store-assets/screenshots/iphone-6.5-1242x2688-paywall.png` | 1242×2688 | Same paywall |
| `store-assets/screenshots/iphone-6.5-1242x2688-unlimited.png` | 1242×2688 | Same unlocked footer |

For the two in-app purchases, attach the paywall. Both products are on that one screen, so the two files are the same image:

| File | Size | Attach to |
| --- | --- | --- |
| `store-assets/screenshots/iap-unlimited-today-1290x2796.png` | 1290×2796 | Consumable `com.starseedsquad.askbuddha.unlimited.today` |
| `store-assets/screenshots/iap-monthly-1290x2796.png` | 1290×2796 | Subscription `com.starseedsquad.askbuddha.unlimited.monthly` |

The paywall shows the length, the price, the renewal line (“renews each month until you cancel”), and links to Privacy Policy and Terms of Use.

## What you still do in App Store Connect

1. Join the Apple Developer Program, if the account is not already enrolled.
2. Open Agreements, Tax, and Banking and accept the Paid Applications agreement. Add the bank account and tax forms. In-app purchases do not work until this is active.
3. Users and Access → Integrations → App Store Connect API. Generate an Admin key. Put its key ID, issuer ID, and `.p8` into the GitHub secrets `ASC_KEY_ID`, `ASC_ISSUER_ID`, and `ASC_PRIVATE_KEY`. Put the Team ID into `APPLE_TEAM_ID`.
4. Set `UNLOCK_COOKIE_SECRET` on the host. An In-App Purchase API key (`APPLE_IAP_KEY_ID`, `APPLE_IAP_ISSUER_ID`, `APPLE_IAP_PRIVATE_KEY`) is optional.
5. Certificates, Identifiers & Profiles → Identifiers. Register an explicit App ID for `com.starseedsquad.askbuddha`. In-App Purchase is on by default. Do not add Sign in with Apple.
6. Create the App Store app: name Ask AI Buddha, bundle ID `com.starseedsquad.askbuddha`, SKU `ask-buddha-ai`. The home screen name is Ask Buddha. Copy the numeric Apple ID into `APPLE_APP_APPLE_ID` before production purchases are confirmed.
7. Fill App Information with Lifestyle, secondary Reference, the age-rating answers above, and the privacy policy URL.
8. App Privacy: answer from the section above.
9. In-App Purchases: create the subscription group `Ask AI Buddha Unlimited`, then the monthly subscription at $6.99 and the Unlimited today consumable at $0.99, using the product IDs in the table. Add the English display names and descriptions. Turn Family Sharing off. Attach the IAP screenshots once they exist.
10. Pricing: base country United States, prices in the table.
11. Prepare the version 1.0 page: paste the description, subtitle, promotional text, keywords, support URL, and marketing URL from this file. Upload screenshots after they are captured. Choose the build after TestFlight finishes processing.
12. Deploy the website first, including `/privacy` and `/terms`.
13. On GitHub, open Actions → iOS TestFlight → Run workflow. Do this only after steps 3 and 6. The workflow archives with automatic signing and uploads to TestFlight. It does not submit for review, and it does not run on push.
14. In TestFlight, wait for processing, answer export compliance if asked (the app only uses exempt HTTPS encryption), and add an internal tester. Create a Sandbox Apple ID under Users and Access → Sandbox to buy Unlimited today and the monthly subscription.
15. Paste the App Review notes from this file.
16. Select the build and submit for review when the sandbox purchases succeed.

The shell is a WebView of this site plus StoreKit. Apple sometimes rejects a thin website wrapper. The native piece they are reviewing is the purchase flow. If review asks for more native behavior, that is a follow-up, not something this workflow can invent.
