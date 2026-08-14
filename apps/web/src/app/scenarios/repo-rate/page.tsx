import Link from "next/link";
import { connection } from "next/server";

import { signOutAction } from "@/app/auth/actions";
import { AppShell } from "@/components/app-shell";
import { RepoRateSimulator } from "@/components/scenarios/repo-rate-simulator";
import { Card } from "@/components/ui/card";
import { requireUser } from "@/lib/auth/session";
import { getFinancialProfile } from "@/lib/profile/data";

export const metadata = { title: "Repo-rate simulator | RippleLab" };

const testProfileId = "00000000-0000-4000-8000-000000000007";

function profileIdFor(userId: string) {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(
    userId,
  )
    ? userId
    : testProfileId;
}

export default async function RepoRateScenarioPage() {
  await connection();
  const user = await requireUser("/scenarios/repo-rate");
  const profile = await getFinancialProfile(user.id);

  return (
    <AppShell
      activePath="/scenarios/repo-rate"
      signOutAction={signOutAction}
      userEmail={user.email}
    >
      <div className="repo-scenario-page">
        <section className="page-heading">
          <div>
            <p className="eyebrow">First inspectable scenario</p>
            <h1>Translate a repo-rate change into your cash flow.</h1>
            <p>
              RippleLab sends your saved exposure and explicit assumptions to the deterministic
              engine, then separates calculated money from model uncertainty and exposes every
              material causal link for inspection.
            </p>
          </div>
          <div className="page-heading__aside">
            <span className="repo-engine-pill">Deterministic engine</span>
            <span>No language model calculates EMI, interest or net impact.</span>
          </div>
        </section>

        {profile ? (
          <RepoRateSimulator profile={profile} profileId={profileIdFor(user.id)} />
        ) : (
          <Card className="repo-profile-empty" elevated>
            <p className="eyebrow">Profile required</p>
            <h2>Create your financial starting point first.</h2>
            <p>
              The simulator needs a loan balance, weighted loan rate and fixed-deposit balance.
              Complete the five-step profile, then return here.
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
