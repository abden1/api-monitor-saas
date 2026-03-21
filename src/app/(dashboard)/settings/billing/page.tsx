import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { redirect } from "next/navigation";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { BillingButtons } from "@/components/settings/billing-buttons";
import { PLANS } from "@/lib/billing/plans";
import { CheckCircle2 } from "lucide-react";
import { format } from "date-fns";

export default async function BillingPage() {
  const session = await auth();
  if (!session?.user) redirect("/login");

  const teamId = (session.user as { teamId?: string }).teamId;
  if (!teamId) redirect("/dashboard");

  const [team, subscription, monitorCount, statusPageCount] = await Promise.all([
    db.team.findUnique({ where: { id: teamId } }),
    db.subscription.findUnique({ where: { teamId } }),
    db.monitor.count({ where: { teamId } }),
    db.statusPage.count({ where: { teamId } }),
  ]);

  if (!team) redirect("/dashboard");

  const plan = PLANS[team.plan];

  return (
    <div className="space-y-6 max-w-3xl">
      <div>
        <h1 className="text-2xl font-bold">Billing & Subscription</h1>
        <p className="text-muted-foreground">Manage your plan and payment details</p>
      </div>

      {/* Current Plan */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle>Current Plan</CardTitle>
          <Badge className="text-lg px-3 py-1">{plan.name}</Badge>
        </CardHeader>
        <CardContent className="space-y-4">
          {subscription && (
            <p className="text-sm text-muted-foreground">
              {subscription.cancelAtPeriodEnd
                ? `Cancels on ${format(subscription.currentPeriodEnd, "MMM d, yyyy")}`
                : `Renews on ${format(subscription.currentPeriodEnd, "MMM d, yyyy")}`}
            </p>
          )}

          {/* Usage */}
          <div className="grid grid-cols-2 gap-4">
            <div className="border rounded-lg p-3">
              <p className="text-sm text-muted-foreground">Monitors</p>
              <p className="text-2xl font-bold">
                {monitorCount}
                <span className="text-sm font-normal text-muted-foreground ml-1">
                  / {plan.monitors === -1 ? "∞" : plan.monitors}
                </span>
              </p>
            </div>
            <div className="border rounded-lg p-3">
              <p className="text-sm text-muted-foreground">Status Pages</p>
              <p className="text-2xl font-bold">
                {statusPageCount}
                <span className="text-sm font-normal text-muted-foreground ml-1">
                  / {plan.statusPages === -1 ? "∞" : plan.statusPages}
                </span>
              </p>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-2 text-sm">
            {[
              `Check interval: ${plan.checkInterval}s`,
              `Team members: ${plan.teamMembers === -1 ? "Unlimited" : plan.teamMembers}`,
              `SMS alerts: ${plan.sms ? "Yes" : "No"}`,
              `Multi-region: ${plan.multiRegion ? "Yes" : "No"}`,
              `API access: ${plan.apiAccess ? "Yes" : "No"}`,
              `Data retention: ${plan.dataRetentionDays} days`,
            ].map((feature) => (
              <div key={feature} className="flex items-center gap-2">
                <CheckCircle2 className="h-4 w-4 text-green-500 flex-shrink-0" />
                <span className="text-muted-foreground">{feature}</span>
              </div>
            ))}
          </div>

          <BillingButtons currentPlan={team.plan} hasSubscription={!!subscription} />
        </CardContent>
      </Card>

      {/* Plan Comparison */}
      <Card>
        <CardHeader>
          <CardTitle>Compare Plans</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-4 gap-4">
            {Object.entries(PLANS).map(([planKey, planConfig]) => (
              <div
                key={planKey}
                className={`border rounded-lg p-4 ${team.plan === planKey ? "border-primary bg-primary/5" : ""}`}
              >
                <p className="font-semibold text-sm">{planConfig.name}</p>
                <p className="text-2xl font-bold mt-1">${planConfig.price}</p>
                <p className="text-xs text-muted-foreground">/month</p>
                <div className="mt-3 space-y-1">
                  <p className="text-xs">{planConfig.monitors === -1 ? "Unlimited" : planConfig.monitors} monitors</p>
                  <p className="text-xs">{planConfig.checkInterval}s intervals</p>
                  {planConfig.sms && <p className="text-xs text-green-600">SMS alerts</p>}
                  {planConfig.apiAccess && <p className="text-xs text-green-600">API access</p>}
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
