import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { redirect } from "next/navigation";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { getUptimeStats } from "@/lib/uptime";
import { formatResponseTime, getStatusBg } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";
import Link from "next/link";

export default async function AnalyticsPage() {
  const session = await auth();
  if (!session?.user) redirect("/login");

  const teamId = (session.user as { teamId?: string }).teamId;
  if (!teamId) redirect("/dashboard");

  const monitors = await db.monitor.findMany({
    where: { teamId },
    orderBy: { name: "asc" },
  });

  const uptimeStats = await Promise.all(
    monitors.map(async (monitor) => {
      const stats = await getUptimeStats(monitor.id, 30);
      return { monitor, stats };
    })
  );

  const overallUptime =
    uptimeStats.length > 0
      ? uptimeStats.reduce((sum, { stats }) => sum + stats.uptimePercent, 0) / uptimeStats.length
      : 100;

  const incidents30d = await db.incident.count({
    where: {
      teamId,
      createdAt: { gte: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000) },
    },
  });

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Analytics</h1>
        <p className="text-muted-foreground">Performance metrics for the last 30 days</p>
      </div>

      {/* Summary */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-4">
            <p className="text-sm text-muted-foreground">Overall Uptime</p>
            <p className={`text-3xl font-bold ${overallUptime >= 99.9 ? "text-green-600" : overallUptime >= 99 ? "text-yellow-600" : "text-red-600"}`}>
              {overallUptime.toFixed(2)}%
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <p className="text-sm text-muted-foreground">Monitors</p>
            <p className="text-3xl font-bold">{monitors.length}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <p className="text-sm text-muted-foreground">Incidents (30d)</p>
            <p className={`text-3xl font-bold ${incidents30d > 0 ? "text-red-600" : "text-green-600"}`}>
              {incidents30d}
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <p className="text-sm text-muted-foreground">Avg Response Time</p>
            <p className="text-3xl font-bold">
              {formatResponseTime(
                uptimeStats.reduce((sum, { stats }) => sum + (stats.avgResponseTime || 0), 0) / Math.max(1, uptimeStats.filter(({ stats }) => stats.avgResponseTime !== null).length)
              )}
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Per-Monitor Breakdown */}
      <Card>
        <CardHeader>
          <CardTitle>Monitor Performance (30 days)</CardTitle>
        </CardHeader>
        <CardContent>
          {uptimeStats.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-4">No monitors to analyze</p>
          ) : (
            <div className="space-y-0">
              <div className="grid grid-cols-12 gap-4 py-2 px-3 text-xs font-medium text-muted-foreground border-b">
                <div className="col-span-4">Monitor</div>
                <div className="col-span-2 text-right">Uptime</div>
                <div className="col-span-2 text-right">Avg Response</div>
                <div className="col-span-2 text-right">Checks</div>
                <div className="col-span-2 text-right">Failures</div>
              </div>
              {uptimeStats.map(({ monitor, stats }) => (
                <Link
                  key={monitor.id}
                  href={`/monitors/${monitor.id}`}
                  className="grid grid-cols-12 gap-4 py-3 px-3 text-sm hover:bg-accent rounded-md transition-colors"
                >
                  <div className="col-span-4">
                    <div className="flex items-center gap-2">
                      <div className={`h-2 w-2 rounded-full ${
                        monitor.status === "UP" ? "bg-green-500" :
                        monitor.status === "DOWN" ? "bg-red-500" : "bg-yellow-500"
                      }`} />
                      <span className="font-medium truncate">{monitor.name}</span>
                    </div>
                  </div>
                  <div className="col-span-2 text-right">
                    <span className={stats.uptimePercent >= 99.9 ? "text-green-600" : stats.uptimePercent >= 99 ? "text-yellow-600" : "text-red-600"}>
                      {stats.uptimePercent.toFixed(2)}%
                    </span>
                  </div>
                  <div className="col-span-2 text-right text-muted-foreground">
                    {formatResponseTime(stats.avgResponseTime)}
                  </div>
                  <div className="col-span-2 text-right text-muted-foreground">
                    {stats.totalChecks.toLocaleString()}
                  </div>
                  <div className="col-span-2 text-right">
                    <span className={stats.failCount > 0 ? "text-red-600" : "text-muted-foreground"}>
                      {stats.failCount}
                    </span>
                  </div>
                </Link>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
