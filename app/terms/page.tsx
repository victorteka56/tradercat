import type { Metadata } from "next";
import { LegalPage, Section } from "@/components/legal/LegalPage";

export const metadata: Metadata = {
  title: "Terms of Service — TraderCat",
  description: "The terms governing your use of TraderCat.",
};

export default function TermsPage() {
  return (
    <LegalPage title="Terms of Service" updated="July 26, 2026">
      <p>
        These terms govern your use of TraderCat. By creating an account you agree to
        them.
      </p>

      <Section heading="What TraderCat is">
        <p>
          TraderCat is a trading journal and analytics tool. It records the trades you
          import or sync and helps you review your own past trading. It is a
          record-keeping and educational tool.
        </p>
      </Section>

      <Section heading="Not financial advice">
        <p>
          TraderCat does <strong className="text-ink">not</strong> provide investment,
          financial, tax, or legal advice, and nothing in the app — including the
          AI-generated reviews and coaching — is a recommendation to buy, sell, or
          hold any security. The reviews describe your own past trades using your own
          data. Trading involves risk of loss. Decisions you make are your own.
        </p>
      </Section>

      <Section heading="Your account">
        <p>
          You are responsible for keeping your login secure and for the data you put
          into the app. Connect only brokerage accounts you own or are authorized to
          access. Don&apos;t use TraderCat to break the law, infringe others&apos;
          rights, or disrupt the service.
        </p>
      </Section>

      <Section heading="Data accuracy">
        <p>
          Trades are reconstructed from the fills your broker or CSV provides. Where
          that history is incomplete, some figures are marked as estimated or
          excluded. Market data is provided by third parties and may be delayed or
          contain errors. Verify anything you rely on against your broker&apos;s own
          records.
        </p>
      </Section>

      <Section heading="Availability &amp; changes">
        <p>
          The service is provided &quot;as is,&quot; without warranties of any kind. We
          may change, suspend, or discontinue features, and we may update these terms;
          material changes will be reflected in the &quot;last updated&quot; date. Your
          continued use after a change means you accept it.
        </p>
      </Section>

      <Section heading="Limitation of liability">
        <p>
          To the maximum extent permitted by law, TraderCat and its operators are not
          liable for any trading losses or for indirect, incidental, or consequential
          damages arising from your use of the service.
        </p>
      </Section>

      <Section heading="Termination">
        <p>
          You can stop using TraderCat and delete your data at any time from Settings.
          We may suspend or terminate accounts that violate these terms.
        </p>
      </Section>

      <Section heading="Contact">
        <p>Questions about these terms: reach us through the app or our support address.</p>
      </Section>
    </LegalPage>
  );
}
