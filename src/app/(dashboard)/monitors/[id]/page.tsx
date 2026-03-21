import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { notFound, redirect } from "next/navigation";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import Link from "next/link";
import { ArrowLeft, Clock, Globe, Shield, Wifi } from "lucide-react";
import { getStatusBg, getStatusDot, formatResponseTime } from "@/lib/utils";
import { getUptimeStats } from "@/lib/uptime";
import { format, formatDistanceToNow } from "date-fns";
import { UptimeChart } from "@/components/analytics/uptime-chart";
import { ResponseTimeChart } from "@/components/analytics/response-time-chart";

interface PageProps {
  params: { id: string };
}

export default async function MonitorDetailPage({ params }: PageProps) {
  const session = await auth();
  if (!session?.user) redirect("/login");

  const teamId = (session.user as { teamId?: string }).teamId;
  if (!teamId) redirect("/dashboard");

  const monitor = await db.monitor.findFirst({
    where: { id: params.id, teamId },
    include: {
      sslHistory: { orderBy: { recordedAt: "desc" }, take: 5 },
      incidents: {
        where: { status: { not: "RESOLVED" } },
        orderBy: { createdAt: "desc" },
        take: 3,
      },
    },
  });

  if (!monitor) notFound();

  const [uptime30, recentChecks] = await Promise.all([
    getUptimeStats(monitor.id, 30),
    db.checkResult.findMany({
      where: { monitorId: monitor.id },
      orderBy: { timestamp: "desc" },
      take: 50,
    }),
  ]);

  const regions = Array.from(new Set(recentChecks.map((c) => c.region)));

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="icon" asChild>
          <Link href="/monitors">
            <ArrowLeft className="h-4 w-4" />
          </Link>
        </Button>
        <div className="flex-1">
          <div className="flex items-center gap-3">
            <div className={`h-3 w-3 rounded-full ${getStatusDot(monitor.status)} ${monitor.status === "DOWN" ? "animate-pulse" : ""}`} />
            <h1 className="text-2xl font-bold">{monitor.name}</h1>
            <Badge className={getStatusBg(monitor.status)} variant="outline">
              {monitor.status}
            </Badge>
          </div>
          <p className="text-muted-foreground text-sm mt-1">{monitor.url}</p>
        </div>
      </div>

      {/* Quick Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-2 text-muted-foreground text-sm mb-1">
              <Wifi className="h-4 w-4" />
              Uptime (30d)
            </div>
            <div className={`text-2xl font-bold ${uptime30.uptimePercent >= 99 ? "text-green-600" : uptime30.uptimePercent >= 95 ? "text-yellow-600" : "text-red-600"}`}>
              {uptime30.uptimePercent.toFixed(2)}%
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-2 text-muted-foreground text-sm mb-1">
              <Clock className="h-4 w-4" />
              Avg Response
            </div>
            <div className="text-2xl font-bold">
              {formatResponseTime(uptime30.avgResponseTime)}
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-2 text-muted-foreground text-sm mb-1">
              <Globe className="h-4 w-4" />
              Check Interval
            </div>
            <div className="text-2xl font-bold">{monitor.interval}s</div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-2 text-muted-foreground text-sm mb-1">
              <Shield className="h-4 w-4" />
              SSL Expiry
            </div>
            <div className="text-2xl font-bold">
              {monitor.sslExpiresAt
                ? `${Math.floor((monitor.sslExpiresAt.getTime() - Date.now()) / (1000 * 60 * 60 * 24))}d`
                : "N/A"}
            </div>
          </CardContent>
        </Card>
      </div>

      <Tabs defaultValue="overview">
        <TabsList>
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="checks">Recent Checks</TabsTrigger>
          <TabsTrigger value="ssl">SSL Info</TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Response Time (Last 50 checks)</CardTitle>
            </CardHeader>
            <CardContent>
              <ResponseTimeChart data={recentChecks.map(c => ({
                time: format(c.timestamp, "HH:mm"),
                responseTime: c.responseTime,
                status: c.status,
              })).reverse()} />
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Uptime (Last 30 days)</CardTitle>
            </CardHeader>
            <CardContent>
              <UptimeChart data={uptime30.dailyStats} />
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="checks">
          <Card>
            <CardHeader>
              <CardTitle>Recent Check Results</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                {recentChecks.length === 0 ? (
                  <p className="text-muted-foreground text-sm text-center py-4">No checks yet</p>
                ) : (
                  recentChecks.map((check) => (
                    <div key={check.id} className="flex items-center justify-between py-2 border-b last:border-0">
                      <div className="flex items-center gap-3">
                        <div className={`h-2 w-2 rounded-full ${getStatusDot(check.status)}`} />
                        <div>
                          <p className="text-sm font-medium">{check.status}</p>
                          <p className="text-xs text-muted-foreground">{check.region}</p>
                        </div>
                      </div>
                      <div className="text-right">
                        <p className="text-sm">{formatResponseTime(check.responseTime)}</p>
                        <p className="text-xs text-muted-foreground">
                          {format(check.timestamp, "MMM d, HH:mm:ss")}
                        </p>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="ssl">
          <Card>
            <CardHeader>
              <CardTitle>SSL Certificate Information</CardTitle>
            </CardHeader>
            <CardContent>
              {monitor.sslHistory.length === 0 ? (
                <p className="text-muted-foreground text-sm">No SSL data available. SSL info is collected for HTTPS monitors.</p>
              ) : (
                <div className="space-y-4">
                  {monitor.sslHistory.map((ssl) => (
                    <div key={ssl.id} className="border rounded-lg p-4 space-y-2">
                      <div className="flex items-center justify-between">
                        <span className="font-medium">Certificate Details</span>
                        <Badge variant={ssl.isValid ? "outline" : "destructive"}>
                          {ssl.isValid ? "Valid" : "Invalid"}
                        </Badge>
                      </div>
                      <div className="grid grid-cols-2 gap-2 text-sm">
                        <div>
                          <p className="text-muted-foreground">Issuer</p>
                          <p>{ssl.issuer || "Unknown"}</p>
                        </div>
                        <div>
                          <p className="text-muted-foreground">Subject</p>
                          <p>{ssl.subject || "Unknown"}</p>
                        </div>
                        <div>
                          <p className="text-muted-foreground">Expires</p>
                          <p>{ssl.validTo ? format(ssl.validTo, "MMM d, yyyy") : "Unknown"}</p>
                        </div>
                        <div>
                          <p className="text-muted-foreground">Days Until Expiry</p>
                          <p className={ssl.daysUntilExpiry !== null && ssl.daysUntilExpiry <= 7 ? "text-red-600 font-semibold" : ""}>
                            {ssl.daysUntilExpiry !== null ? `${ssl.daysUntilExpiry} days` : "Unknown"}
                          </p>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
