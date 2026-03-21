import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { redirect } from "next/navigation";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ProfileForm } from "@/components/settings/profile-form";
import { ApiKeysSection } from "@/components/settings/api-keys-section";
import { TwoFactorSection } from "@/components/settings/two-factor-section";
import Link from "next/link";
import { Button } from "@/components/ui/button";

export default async function SettingsPage() {
  const session = await auth();
  if (!session?.user) redirect("/login");

  const user = await db.user.findUnique({
    where: { id: session.user.id },
    select: { id: true, name: true, email: true, timezone: true, totpEnabled: true },
  });

  if (!user) redirect("/login");

  return (
    <div className="space-y-6 max-w-2xl">
      <div>
        <h1 className="text-2xl font-bold">Settings</h1>
        <p className="text-muted-foreground">Manage your account preferences</p>
      </div>

      <ProfileForm user={user} />
      <TwoFactorSection enabled={user.totpEnabled} />
      <ApiKeysSection />

      <Card>
        <CardHeader>
          <CardTitle>Billing</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground mb-4">
            Manage your subscription and billing information.
          </p>
          <Button asChild>
            <Link href="/settings/billing">Go to Billing</Link>
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}
