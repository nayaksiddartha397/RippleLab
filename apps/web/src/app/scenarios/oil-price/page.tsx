import type { Metadata } from "next";
import Link from "next/link";
import { connection } from "next/server";

import { signOutAction } from "@/app/auth/actions";
import { AppShell } from "@/components/app-shell";
import { OilPriceSimulator } from "@/components/scenarios/oil-price-simulator";
import { Card } from "@/components/ui/card";
import { requireUser } from "@/lib/auth/session";
import { getFinancialProfile } from "@/lib/profile/data";

const title = "Oil-price simulator | RippleLab";
const description =
  "Translate a crude-oil scenario into direct fuel and indirect household expense effects.";

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

export default async function OilPriceScenarioPage() {
  await connection();
  const user = await requireUser("/scenarios/oil-price");
  const profile = await getFinancialProfile(user.id);

  return (
    <AppShell
      activePath="/scenarios/oil-price"
      signOutAction={signOutAction}
      userEmail={user.email}
    >
      <div className="repo-scenario-page oil-scenario-page">
        <section className="page-heading">
          <div>
            <p className="eyebrow">Personal oil-price engine</p>
            <h1>Translate a crude-oil shock into household expenses.</h1>
            <p>
              Keep the global crude scenario separate from your local retail fuel price, then
              inspect direct driving costs and indirect transport, food and utility effects.
            </p>
          </div>
          <div className="page-heading__aside">
            <span className="repo-engine-pill">Deterministic engine</span>
            <span>Every transmission rate is visible, editable and source-linked.</span>
          </div>
        </section>

        {profile ? (
          <OilPriceSimulator profile={profile} profileId={profileIdFor(user.id)} />
        ) : (
          <Card className="repo-profile-empty" elevated>
            <p className="eyebrow">Profile required</p>
            <h2>Create your expense starting point first.</h2>
            <p>
              The oil-price model needs your household expenses to seed transport, food and
              utility exposures. Complete the profile, then return here.
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
