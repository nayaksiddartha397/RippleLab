import { updatePasswordAction } from "@/app/auth/actions";
import { AuthForm } from "@/components/auth/auth-form";
import { AuthLayout } from "@/components/auth/auth-layout";
import { requireUser } from "@/lib/auth/session";

export const metadata = { title: "Choose new password | RippleLab" };

export default async function UpdatePasswordPage({
  searchParams,
}: {
  searchParams: Promise<{ recovery?: string }>;
}) {
  await searchParams;
  await requireUser("/auth/update-password");

  return (
    <AuthLayout eyebrow="Secure your account" title="Choose a new password">
      <p className="auth-panel__intro">Use a unique password that you do not use for another service.</p>
      <AuthForm
        action={updatePasswordAction}
        fields={[
          { autoComplete: "new-password", hint: "At least 12 characters with a letter and number.", label: "New password", minLength: 12, name: "password", type: "password" },
          { autoComplete: "new-password", label: "Confirm new password", minLength: 12, name: "confirmPassword", type: "password" },
        ]}
        submitLabel="Update password"
      />
    </AuthLayout>
  );
}
