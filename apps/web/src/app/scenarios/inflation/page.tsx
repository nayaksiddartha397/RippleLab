import Link from "next/link";
import { connection } from "next/server";

import { signOutAction } from "@/app/auth/actions";
import { AppShell } from "@/components/app-shell";
import { InflationSimulator } from "@/components/scenarios/inflation-simulator";
import { Card } from "@/components/ui/card";
import { requireUser } from "@/lib/auth/session";
import { getFinancialProfile } from "@/lib/profile/data";

export const metadata = { title: "Inflation simulator | RippleLab" };

const testProfileId = "00000000-0000-4000-8000-000000000007";

function profileIdFor(userId: string) {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(
    userId,
  )
    ? userId
    : testProfileId;
}

export default async function InflationScenarioPage() {
  await connection();
  const user = await requireUser("/scenarios/inflation");
  const profile = await getFinancialProfile(user.id);

  return (
    <AppShell
      activePath="/scenarios/inflation"
      signOutAction={signOutAction}
      userEmail={user.email}
    >
      <div className="repo-scenario-page inflation-scenario-page">
        <section className="page-heading">
          <div>
            <p className="eyebrow">Personal inflation engine</p>
            <h1>See which prices put pressure on your household.</h1>
            <p>
              Compare the current and target inflation paths using your own editable expense
              basket. RippleLab keeps category spending, price pass-through, salary growth and
              nominal returns visible as assumptions.
            </p>
          </div>
          <div className="page-heading__aside">
            <span className="repo-engine-pill">Deterministic engine</span>
            <span>Headline CPI is context; your basket determines the personal result.</span>
          </div>
        </section>

        {profile ? (
          <InflationSimulator profile={profile} profileId={profileIdFor(user.id)} />
        ) : (
          <Card className="repo-profile-empty" elevated>
            <p className="eyebrow">Profile required</p>
            <h2>Create your monthly expense starting point first.</h2>
            <p>
              The inflation model needs your essential, discretionary and housing expenses,
              income and financial balances. Complete the profile, then return here.
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
