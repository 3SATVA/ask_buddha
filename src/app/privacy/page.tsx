import type { Metadata } from "next";
import { LegalPage } from "@/components/legal-page";
import { unlimitedDailyCap } from "@/lib/config";

export const metadata: Metadata = {
  title: "Privacy — ASK BUDDHA",
  description:
    "How Ask AI Buddha handles the words you type, the daily limit, and App Store and Google Play purchases.",
};

export default function PrivacyPage() {
  const cap = unlimitedDailyCap();
  return (
    <LegalPage
      title="Privacy"
      lede="Ask AI Buddha does not ask you to make an account. This page says what leaves your device, and what stays."
    >
      <p>
        The words you type are sent to this app’s server so a reply can be written. The server
        sends that conversation to OpenAI to produce the answer. It does not keep a copy of the
        chat after the reply is streamed back. The conversation you see is stored on your device.
      </p>
      <p>
        If a message looks like you may be in danger, the server answers with public help lines
        and does not send that message to the model. Those help lines are the 988 Suicide &
        Crisis Lifeline, the National Domestic Violence Hotline, Childhelp, and local emergency
        numbers.
      </p>
      <p>
        A small cookie named ask_buddha_quota remembers how many messages this browser has used
        today. The free allowance is 10 messages per UTC day. A day pass or subscription uses the
        same cookie, up to {cap} messages that day. The cookie is not an account.
      </p>
      <p>
        On the iOS app, Unlimited today and the monthly subscription are processed by Apple. On
        the Android app, the same products are processed by Google Play. This app does not receive
        your card number. The website does not sell these and does not use Stripe. After Apple
        returns a signed transaction, or Google Play returns a purchase token, the server checks
        it with that store and, if it is valid, sets a cookie named ask_buddha_unlock. That cookie
        says how long the purchase lasts: until the end of the UTC day for Unlimited today, or
        until the subscription period ends. Messages during that time still count toward the daily
        cap above. If a giving page is configured, it is only shown on the website, never inside
        the apps.
      </p>
      <p>
        The app does not use advertising identifiers, and it does not sell personal information.
        It is not directed to children under 13.
      </p>
        <p>
          Questions about privacy can be sent through the contact on the App Store listing for
          Ask AI Buddha, or on the Google Play listing.
        </p>
    </LegalPage>
  );
}
