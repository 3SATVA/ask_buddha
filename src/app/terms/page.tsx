import type { Metadata } from "next";
import { LegalPage } from "@/components/legal-page";
import { unlimitedDailyCap } from "@/lib/config";

export const metadata: Metadata = {
  title: "Terms — ASK BUDDHA",
  description:
    "Terms for Ask AI Buddha, including the free daily messages and the iOS and Android day pass and subscription.",
};

export default function TermsPage() {
  const cap = unlimitedDailyCap();
  return (
    <LegalPage
      title="Terms"
      lede="Ask AI Buddha is a conversation grounded in Theravada Buddhism and the Pali Canon. These terms say what it is, and what an app purchase buys."
    >
      <p>
        The voice is an AI. It is not the Buddha, not scripture, and not a teacher, doctor, lawyer, or
        counselor. Do not rely on it for medical, legal, or financial decisions. If you may be in
        danger, contact local emergency services or the help lines named in the app.
      </p>
      <p>
        The website, the iOS app, and the Android app include 10 free messages per UTC day on that
        device. A new day starts at midnight UTC. Crisis replies do not use one of those messages.
        The website does not sell messages. It has no checkout and does not use Stripe.
      </p>
      <p>
        The iOS app sells Unlimited today and one monthly subscription through Apple In-App
        Purchase. The Android app sells the same two products through Google Play Billing. There
        is no other way to pay inside either app.
      </p>
      <ul className="list-disc space-y-2 pl-5">
        <li>
          Unlimited today is a consumable. It unlocks messages until midnight UTC on the day it is
          bought, up to {cap} messages that day. It is $0.99.
        </li>
        <li>
          Monthly is an auto-renewable subscription. It unlocks messages until the paid period
          ends, up to {cap} messages each UTC day. It is $6.99 a month.
        </li>
      </ul>
      <p>
        On iOS, payment is charged to your Apple ID at confirmation. On Android, payment is
        charged to your Google account at confirmation. The subscription renews each month unless
        you cancel it at least 24 hours before the current period ends, in Apple ID settings or in
        Google Play. The store renews the charge within 24 hours before the period ends. Unlimited
        today is used when you buy it and is not a subscription. Refunds are handled by Apple or
        Google.
      </p>
      <p>
        Restoring purchases puts an active subscription back on this device. Unlimited today
        stays on the device that confirmed it, until that UTC day ends.
      </p>
      <p>
        You keep the words on your device. Do not use the app to harm someone, to break the law,
        or to pretend an answer is scripture. The service can change or stop. These terms apply
        to the website, to the App Store app Ask AI Buddha, and to the Android app.
      </p>
    </LegalPage>
  );
}
