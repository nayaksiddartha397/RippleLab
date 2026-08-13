import { connection } from "next/server";

import { signOutAction } from "@/app/auth/actions";
import { AppShell } from "@/components/app-shell";
import { ProfileWizard } from "@/components/profile/profile-wizard";
import { Card } from "@/components/ui/card";
import { requireUser } from "@/lib/auth/session";
import { formatRupeesFromPaise, labelFromValue } from "@/lib/profile/format";
import { getFinancialProfile } from "@/lib/profile/data";

export const metadata = { title: "Financial profile | RippleLab" };

export default async function ProfilePage() {
  await connection();
  const user = await requireUser("/profile");
  const profile = await getFinancialProfile(user.id);

  const monthlyIncome = profile ? profile.monthlyTakeHomePaise + profile.monthlyOtherIncomePaise : 0;
  const monthlyOutgo = profile
    ? profile.monthlyEssentialExpensesPaise + profile.monthlyDiscretionaryExpensesPaise + profile.monthlyRentPaise + profile.monthlyEmiPaise
    : 0;

  return (
    <AppShell activePath="/profile" signOutAction={signOutAction} userEmail={user.email}>
      <div className="profile-page">
        <section className="page-heading">
          <div>
            <p className="eyebrow">Your economic digital twin</p>
            <h1>{profile ? "Keep your financial profile current." : "Build your financial starting point."}</h1>
            <p>Five short steps give RippleLab the context to estimate how an economic change could reach your household.</p>
          </div>
          <div className="page-heading__aside">
            <span className="profile-privacy-pill">Private by default</span>
            <span>Protected access and row-level ownership rules keep each account isolated.</span>
          </div>
        </section>

        <div className="profile-layout">
          <Card elevated>
            <ProfileWizard initialProfile={profile} />
          </Card>
          <aside className="profile-summary" aria-label="Profile summary">
            <Card>
              <p className="eyebrow">Profile status</p>
              <h2>{profile ? "Ready for personal scenarios" : "Not complete yet"}</h2>
              <p>{profile ? `Last saved ${new Intl.DateTimeFormat("en-IN", { dateStyle: "medium", timeStyle: "short" }).format(new Date(profile.updatedAt))}` : "Complete all five steps to activate personal impact estimates."}</p>
            </Card>
            {profile ? (
              <Card>
                <p className="eyebrow">Current snapshot</p>
                <dl className="profile-summary__list">
                  <div><dt>Monthly income</dt><dd>{formatRupeesFromPaise(monthlyIncome)}</dd></div>
                  <div><dt>Monthly outgo</dt><dd>{formatRupeesFromPaise(monthlyOutgo)}</dd></div>
                  <div><dt>Housing</dt><dd>{labelFromValue(profile.housingStatus)}</dd></div>
                  <div><dt>Primary goal</dt><dd>{labelFromValue(profile.primaryGoal)}</dd></div>
                </dl>
              </Card>
            ) : null}
            <div className="profile-data-note">
              <strong>Precision without false certainty</strong>
              <p>Money is stored in paise and rates in basis points. You can use sensible estimates and update them later.</p>
            </div>
          </aside>
        </div>
      </div>
    </AppShell>
  );
}
