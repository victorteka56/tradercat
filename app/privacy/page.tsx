import type { Metadata } from "next";
import { LegalPage, Section } from "@/components/legal/LegalPage";

export const metadata: Metadata = {
  title: "Privacy Policy — TraderCat",
  description: "How TraderCat collects, uses, and protects your data.",
};

export default function PrivacyPage() {
  return (
    <LegalPage title="Privacy Policy" updated="July 26, 2026">
      <p>
        TraderCat is a trading journal. This policy explains what we collect, why,
        who we share it with, and the control you have over it.
      </p>

      <Section heading="What we collect">
        <ul className="list-disc space-y-1 pl-5">
          <li>
            <strong className="text-ink">Account:</strong> your email address and
            display name, to sign you in and label the app.
          </li>
          <li>
            <strong className="text-ink">Trading data:</strong> the trades, fills,
            and positions you import from a CSV or that we sync from a brokerage you
            connect. We use this only to build your journal, analytics, and reviews.
          </li>
          <li>
            <strong className="text-ink">Notes &amp; tags:</strong> anything you add
            to a trade yourself.
          </li>
        </ul>
        <p>
          We do <strong className="text-ink">not</strong> collect or store your
          brokerage username or password. Brokerage connections are read-only and
          handled by our aggregation partner (below); the access token we hold on
          your behalf is encrypted at rest.
        </p>
      </Section>

      <Section heading="Who we share it with">
        <p>We use a small set of processors, each only for the function named:</p>
        <ul className="list-disc space-y-1 pl-5">
          <li>
            <strong className="text-ink">Supabase</strong> — authentication and the
            database that stores your data.
          </li>
          <li>
            <strong className="text-ink">SnapTrade</strong> — read-only brokerage
            connections. Your broker credentials go to your broker, never to us.
          </li>
          <li>
            <strong className="text-ink">Polygon.io</strong> — market prices and news
            for the symbols you hold or traded.
          </li>
          <li>
            <strong className="text-ink">DeepSeek</strong> — generates the
            plain-English trade and coaching reviews from your computed trade
            metrics.
          </li>
        </ul>
        <p>
          We do not sell your data, and we do not share it with anyone for
          advertising.
        </p>
      </Section>

      <Section heading="How it's protected">
        <p>
          Every row of your data is isolated to your account at the database level
          (row-level security), so one account can never read another&apos;s.
          Brokerage access tokens are encrypted. Access to production data is
          limited to operating the service.
        </p>
      </Section>

      <Section heading="Your rights">
        <p>
          You can <strong className="text-ink">export</strong> all of your data as a
          file, and <strong className="text-ink">delete</strong> all of it, at any
          time from Settings. Deletion is immediate and permanent. Depending on where
          you live, you may have additional rights (access, correction, portability)
          under laws such as the GDPR or CCPA — contact us to exercise them.
        </p>
      </Section>

      <Section heading="Retention">
        <p>
          We keep your data while your account is active. When you delete it, it is
          removed from our database; cached market data (which is not personal to
          you) may persist as shared reference data.
        </p>
      </Section>

      <Section heading="Contact">
        <p>
          Questions about this policy or your data: reach us through the app or at the
          support address listed on our site.
        </p>
      </Section>
    </LegalPage>
  );
}
