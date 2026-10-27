# Ask AI Buddha — Google Play

The Android app is a Capacitor shell with the package name `com.starseedsquad.askbuddha`, the same id as the iOS bundle. It loads the live site (by default `https://ask-buddha-wine.vercel.app`, or `CAPACITOR_SERVER_URL` / `NEXT_PUBLIC_SITE_URL` when set) and sells messages only through Google Play Billing. The website keeps the free daily limit. It has no checkout and does not use Stripe. The optional `NEXT_PUBLIC_SUPPORT_URL` link is shown on the website only, never inside the app.

The Play Console app does not exist yet. The workflow `.github/workflows/android-release.yml` is manual only (`workflow_dispatch`). It can build a signed bundle before the Play app exists. The upload to internal testing waits until the service account secret exists.

## Listing

| Field | Value |
| --- | --- |
| App name | Ask AI Buddha |
| Package name | `com.starseedsquad.askbuddha` |
| Default language | English (United States) |
| App category | Lifestyle |
| Tags | Books & reference, if the console offers a secondary tag |
| Short description | A quiet talk with the Dhamma. Ten free messages a day. |
| Privacy policy URL | `https://ask-buddha-wine.vercel.app/privacy` |
| Website | `https://ask-buddha-wine.vercel.app` |
| Email | The contact on the developer account |
| Price | Free, with in-app products |
| Ads | No |
| Content rating | Teen. It is a conversation, not directed to children under 13. |
| Target audience | 18 and older. Not designed for children. |

The short description is 56 characters. Play allows 80.

Production is `https://ask-buddha-wine.vercel.app`. Set `NEXT_PUBLIC_SITE_URL` if a custom domain replaces that host.

### Full description

Ask AI Buddha is a quiet place to talk. You write what is on your mind. The reply is short, in the first person, grounded in Theravada Buddhism and the Pali Canon. When it quotes scripture, it quotes the Sutta Pitaka, with a citation.

Ten messages a day are free. On this Android app, Unlimited today opens the rest of the day for $0.99, and a monthly subscription keeps every day open for $6.99. Those are purchased from Google Play, inside the app. A day pass or subscription includes 300 messages each UTC day.

This is not the Buddha, and it is not scripture. It is not a teacher in your community, a doctor, or a counselor. If you may be in danger, the app points you to real help, including 988 in the United States.

Privacy policy: https://ask-buddha-wine.vercel.app/privacy
Terms of use: https://ask-buddha-wine.vercel.app/terms

## Products

Create these in Play Console → Monetize → Products. Product IDs cannot be changed later. Play allows 1–40 lowercase characters. The Apple IDs are `com.starseedsquad.askbuddha.unlimited.today` (43 characters) and `com.starseedsquad.askbuddha.unlimited.monthly` (45 characters), so Play Console will reject them. Android uses these shorter IDs for the same two products.

| Product ID | Type | Price | Base plan | What it unlocks |
| --- | --- | --- | --- | --- |
| `unlimited.today` | One-time product, consumable | $0.99 | — | Messages until midnight UTC on the day it is bought, up to 300 that day |
| `unlimited.monthly` | Subscription | $6.99 | `monthly`, auto-renewing, billed every month | Messages until the period ends, up to 300 each UTC day |

Name for the one-time product: `Unlimited today`
Description: `Messages until midnight UTC on the day you buy it, up to 300 that day.`

Subscription name: `Monthly`
Subscription description: `Messages with Ask AI Buddha until you cancel, up to 300 each day.`
Base plan ID: `monthly`
Billing period: 1 month
Renewal: auto-renewing
Grace period: 7 days, if the console offers it

The server consumes `unlimited.today` after Google confirms it, so it can be bought again on another day. The server acknowledges the subscription after Google confirms it. The app finishes the same purchase on the device. Family sharing stays off.

A day is the same UTC day the free limit uses. Unlimited today bought at 11pm UTC lasts until midnight UTC.

## Data safety

Answer from what the app does:

- Data is collected: yes. The words of a conversation are sent to the app server, then to OpenAI, to write a reply. The server does not keep the chat after the reply is streamed.
- Data is shared: the conversation is sent to OpenAI to produce the reply. It is not sold, and it is not used for ads.
- Purchases: Google Play processes payment. The server sends the purchase token to the Google Play Developer API and stores the unlock only in a cookie on the device. Card numbers are not collected.
- Account, name, email, phone, location, photos, and advertising ID: not collected.
- Data is encrypted in transit. The user can ask for deletion of the on-device conversation with New conversation. There is no account to delete.
- The app is not directed to children.

## Server environment

Set these on the host that serves the website (Vercel), not in the Android binary. The free website keeps working if they are empty. Android purchases cannot be confirmed until the service account is set. iOS uses the Apple variables in `store-assets/APP_STORE.md`.

| Variable | Purpose |
| --- | --- |
| `GOOGLE_PLAY_SERVICE_ACCOUNT_JSON` | The service account JSON, or that JSON encoded as base64. This is the key the server uses to call the Play Developer API. |
| `GOOGLE_PLAY_PACKAGE_NAME` | Optional. Defaults to `com.starseedsquad.askbuddha`. |
| `UNLOCK_COOKIE_SECRET` | A long random string. It signs the cookie that remembers a verified unlock. The same secret covers iOS and Android. |
| `UNLIMITED_DAILY_CAP` | Optional. Fair-use cap for a day pass or subscription, per UTC day. Defaults to `300`. |
| `MAX_OUTPUT_TOKENS` | Optional. Maximum tokens generated for one reply. Defaults to `420`. |

The server calls `purchases.products.get` for Unlimited today and `purchases.subscriptionsv2.get` for the monthly plan. It then calls `purchases.products.consume` or `purchases.subscriptions.acknowledge`. A consumable grants access until the end of its purchase day. A subscription grants access while Google reports it active, canceled but not yet expired, or in a grace period. On hold, paused, pending, and expired grant nothing. If `GOOGLE_PLAY_SERVICE_ACCOUNT_JSON` is missing or invalid, the purchase is refused and no unlock is stored.

## GitHub secrets

The workflow `.github/workflows/android-release.yml` is manual (`workflow_dispatch` only). It does not run on push. It builds a signed `.aab` with versionCode 1 and versionName 1.0, checks the signature, and saves that file as the artifact `ask-buddha-release-aab`. The upload to the Play internal testing track runs only when `GOOGLE_PLAY_SERVICE_ACCOUNT_JSON` is set. An empty secret skips that step and the bundle is still saved. The next Play upload needs a higher versionCode, because Play rejects a repeated one.

| Secret | Required | What to paste |
| --- | --- | --- |
| `ANDROID_KEYSTORE_BASE64` | Yes | The upload keystore (PKCS12), encoded as base64. One line, no spaces. |
| `ANDROID_KEYSTORE_PASSWORD` | Yes | The keystore password. |
| `ANDROID_KEY_ALIAS` | Yes | The key alias inside that keystore. This repo's upload key uses `upload`. |
| `ANDROID_KEY_PASSWORD` | Yes | The key password. It is often the same as the keystore password. |
| `GOOGLE_PLAY_SERVICE_ACCOUNT_JSON` | No | The service account JSON used to upload the bundle. Raw JSON, or the same JSON encoded as base64. Leave it empty until the Play app exists. The signed bundle is still built. This can be the same account the server uses to verify purchases, if that account also has permission to release to testing tracks. |
| `CAPACITOR_SERVER_URL` | No | Site the shell should load. When empty, the app loads `https://ask-buddha-wine.vercel.app`. |

Create the keystore once and keep the file. Losing it means you cannot ship updates with the same upload key.

```bash
keytool -genkeypair -v -storetype PKCS12 -keystore ask-buddha-upload.p12 -alias upload -keyalg RSA -keysize 2048 -validity 10000
base64 -w 0 ask-buddha-upload.p12
```

On macOS, `base64` has no `-w`. Use `base64 -i ask-buddha-upload.p12 | tr -d '\n'`. The alias in the existing upload key is `upload`.

## What you still do in Play Console

1. Create a Google Play developer account, if you do not already have one.
2. Play Console → Create app. Name Ask AI Buddha, default language English (United States), app, free. Accept the policies.
3. Set the package name to `com.starseedsquad.askbuddha` on the first upload. It cannot be changed later.
4. App content: privacy policy URL, ads no, app access all functionality available, content rating questionnaire for a conversation app with no restricted content, target audience 18 and over, news app no, COVID-19 tracing no, data safety from the section above, government app no, financial features no, health no.
5. Store listing: paste the short description and full description from this file. Add a 1024×500 feature graphic, a 512×512 app icon (`store-assets/ask-buddha-play-512.png`), and phone screenshots. The adaptive icon in the project is the portrait from `store-assets/ask-buddha-ios-1024.png`.
6. Google Cloud → enable the Google Play Android Developer API. Create a service account and download its JSON. In Play Console → Users and permissions, invite that service account email. Grant “Manage orders and subscriptions” so the server can verify purchases, and “Release to testing tracks” so the workflow can upload. It can take a day for a new permission to work.
7. Put the JSON in the server variable `GOOGLE_PLAY_SERVICE_ACCOUNT_JSON` and in the GitHub secret of the same name. Also set `UNLOCK_COOKIE_SECRET` on the server.
8. Monetize → Products: create `unlimited.today` at $0.99 and the subscription `unlimited.monthly` with base plan `monthly` at $6.99. Activate both.
9. Deploy this website first, so the shell loads the paywall and the privacy and terms pages.
10. The first Android App Bundle often has to be uploaded by a person in Play Console → Internal testing, because the Play API rejects the first upload. Download `ask-buddha-release-aab` from the workflow artifact and upload that first bundle by hand. After Play accepts it, later runs can upload to internal testing once `GOOGLE_PLAY_SERVICE_ACCOUNT_JSON` is set. Raise versionCode above 1 before that second upload.
11. On GitHub, open Actions → Android release → Run workflow. The keystore secrets are required. The Play service account is not.
12. Internal testing → testers. Add the Gmail accounts. License testing (Setup → License testing) makes those purchases free.
13. Install from the internal testing opt-in link. Tap Support, or send 10 messages, to open the paywall. Buy Unlimited today and the monthly plan with a license tester. Restore purchases should put the subscription back.

The shell is a WebView of this site plus Play Billing. Google sometimes rejects a thin website wrapper. The native piece they are reviewing is the purchase flow. If review asks for more native behavior, that is a follow-up.
