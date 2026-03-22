import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { redirect } from "next/navigation";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { BillingButtons, PlanUpgradeButton } from "@/components/settings/billing-buttons";
import { PLANS } from "@/lib/billing/plans";
import { CheckCircle2, Zap } from "lucide-react";
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
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {Object.entries(PLANS).map(([planKey, planConfig]) => {
              const isCurrent = team.plan === planKey;
              const isDowngrade = ["FREE", "STARTER", "PRO", "ENTERPRISE"].indexOf(planKey) <
                ["FREE", "STARTER", "PRO", "ENTERPRISE"].indexOf(team.plan);
              const isPaid = planKey !== "FREE";
              return (
                <div
                  key={planKey}
                  className={`border rounded-lg p-5 flex flex-col gap-3 relative ${
                    isCurrent ? "border-primary bg-primary/5 ring-1 ring-primary" : "hover:border-gray-400 transition-colors"
                  }`}
                >
                  {isCurrent && (
                    <span className="absolute -top-2.5 left-1/2 -translate-x-1/2 bg-primary text-primary-foreground text-xs px-2 py-0.5 rounded-full whitespace-nowrap">
                      Current plan
                    </span>
                  )}
                  <div>
                    <p className="font-bold text-base">{planConfig.name}</p>
                    <div className="flex items-end gap-1 mt-1">
                      <span className="text-3xl font-bold">${planConfig.price}</span>
                      <span className="text-sm text-muted-foreground mb-1">/mo</span>
                    </div>
                  </div>
                  <ul className="space-y-1.5 text-sm flex-1">
                    <li className="flex items-center gap-2">
                      <CheckCircle2 className="h-3.5 w-3.5 text-green-500 flex-shrink-0" />
                      {planConfig.monitors === -1 ? "Unlimited" : planConfig.monitors} monitors
                    </li>
                    <li className="flex items-center gap-2">
                      <CheckCircle2 className="h-3.5 w-3.5 text-green-500 flex-shrink-0" />
                      {planConfig.checkInterval}s check interval
                    </li>
                    <li className="flex items-center gap-2">
                      <CheckCircle2 className="h-3.5 w-3.5 text-green-500 flex-shrink-0" />
                      {planConfig.statusPages === -1 ? "Unlimited" : planConfig.statusPages} status pages
                    </li>
                    <li className="flex items-center gap-2">
                      <CheckCircle2 className="h-3.5 w-3.5 text-green-500 flex-shrink-0" />
                      {planConfig.teamMembers === -1 ? "Unlimited" : planConfig.teamMembers} team members
                    </li>
                    {planConfig.sms && (
                      <li className="flex items-center gap-2">
                        <CheckCircle2 className="h-3.5 w-3.5 text-green-500 flex-shrink-0" />
                        SMS alerts
                      </li>
                    )}
                    {planConfig.apiAccess && (
                      <li className="flex items-center gap-2">
                        <CheckCircle2 className="h-3.5 w-3.5 text-green-500 flex-shrink-0" />
                        API access
                      </li>
                    )}
                    {planConfig.multiRegion && (
                      <li className="flex items-center gap-2">
                        <CheckCircle2 className="h-3.5 w-3.5 text-green-500 flex-shrink-0" />
                        Multi-region
                      </li>
                    )}
                  </ul>
                  {!isCurrent && isPaid && !isDowngrade && (
                    <PlanUpgradeButton plan={planKey} />
                  )}
                  {isCurrent && planKey === "FREE" && (
                    <p className="text-xs text-muted-foreground text-center">Your current plan</p>
                  )}
                  {isDowngrade && !isCurrent && (
                    <p className="text-xs text-muted-foreground text-center">Manage via portal to downgrade</p>
                  )}
                </div>
              );
            })}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
