import type { Metadata } from "next";
import Link from "next/link";
import { connection } from "next/server";

import { signOutAction } from "@/app/auth/actions";
import { AppShell } from "@/components/app-shell";
import { IncomeTaxSimulator } from "@/components/scenarios/income-tax-simulator";
import { Card } from "@/components/ui/card";
import { requireUser } from "@/lib/auth/session";
import { getFinancialProfile } from "@/lib/profile/data";

const title = "Income-tax simulator | RippleLab";
const description =
  "Compare AY 2026-27 income tax with an editable marginal-rate change and see the personal take-home effect.";

export const metadata: Metadata = {
  title,
  description,
  openGraph: { title, description, images: [] },
  twitter: { title, description, images: [] },
};

const testProfileId = "00000000-0000-4000-8000-000000000007";

function profileIdFor(userId: string) {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(
    userId,
  )
    ? userId
    : testProfileId;
}

export default async function IncomeTaxScenarioPage() {
  await connection();
  const user = await requireUser("/scenarios/income-tax");
  const profile = await getFinancialProfile(user.id);

  return (
    <AppShell
      activePath="/scenarios/income-tax"
      signOutAction={signOutAction}
      userEmail={user.email}
    >
      <div className="repo-scenario-page tax-scenario-page">
        <section className="page-heading">
          <div>
            <p className="eyebrow">Personal income-tax engine</p>
            <h1>See how a marginal-rate change reaches your take-home pay.</h1>
            <p>
              Start with AY 2026-27 new-regime slabs, edit the income and relief assumptions,
              then compare current tax with a clean policy scenario.
            </p>
          </div>
          <div className="page-heading__aside">
            <span className="repo-engine-pill">Deterministic engine</span>
            <span>Official slabs stay separate from your editable salary assumptions.</span>
          </div>
        </section>

        {profile ? (
          <IncomeTaxSimulator profile={profile} profileId={profileIdFor(user.id)} />
        ) : (
          <Card className="repo-profile-empty" elevated>
            <p className="eyebrow">Profile required</p>
            <h2>Create your income starting point first.</h2>
            <p>
              The tax model uses your saved monthly income to seed an editable annual salary
              proxy. Complete the profile, then return here.
            </p>
            <Link className="button button--primary button--md" href="/profile">
              Create financial profile
            </Link>
          </Card>
        )}
      </div>
    </AppShell>
  );
}
