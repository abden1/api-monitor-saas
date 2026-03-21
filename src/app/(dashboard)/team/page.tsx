import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { redirect } from "next/navigation";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { TeamInviteForm } from "@/components/team/team-invite-form";
import { Users } from "lucide-react";
import { format } from "date-fns";

export default async function TeamPage() {
  const session = await auth();
  if (!session?.user) redirect("/login");

  const teamId = (session.user as { teamId?: string }).teamId;
  if (!teamId) redirect("/dashboard");

  const [members, team, invitations] = await Promise.all([
    db.teamMember.findMany({
      where: { teamId },
      include: { user: { select: { id: true, name: true, email: true, image: true } } },
      orderBy: { createdAt: "asc" },
    }),
    db.team.findUnique({ where: { id: teamId }, select: { name: true, plan: true } }),
    db.invitation.findMany({
      where: { teamId, status: "PENDING" },
      orderBy: { createdAt: "desc" },
    }),
  ]);

  const roleColors: Record<string, string> = {
    OWNER: "bg-purple-100 text-purple-800",
    ADMIN: "bg-blue-100 text-blue-800",
    MEMBER: "bg-gray-100 text-gray-800",
    VIEWER: "bg-green-100 text-green-800",
  };

  return (
    <div className="space-y-6 max-w-3xl">
      <div>
        <h1 className="text-2xl font-bold">Team</h1>
        <p className="text-muted-foreground">{team?.name} · {members.length} member{members.length !== 1 ? "s" : ""}</p>
      </div>

      <TeamInviteForm />

      <Card>
        <CardHeader>
          <CardTitle>Team Members</CardTitle>
        </CardHeader>
        <CardContent className="space-y-2">
          {members.map((member) => (
            <div key={member.id} className="flex items-center justify-between py-3 border-b last:border-0">
              <div className="flex items-center gap-3">
                <div className="h-9 w-9 rounded-full bg-primary/10 flex items-center justify-center text-sm font-semibold text-primary">
                  {member.user.name?.[0]?.toUpperCase() || member.user.email[0].toUpperCase()}
                </div>
                <div>
                  <p className="font-medium text-sm">{member.user.name || "—"}</p>
                  <p className="text-xs text-muted-foreground">{member.user.email}</p>
                </div>
              </div>
              <Badge className={roleColors[member.role] || ""} variant="outline">
                {member.role}
              </Badge>
            </div>
          ))}
        </CardContent>
      </Card>

      {invitations.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Pending Invitations</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            {invitations.map((inv) => (
              <div key={inv.id} className="flex items-center justify-between py-3 border-b last:border-0">
                <div>
                  <p className="text-sm">{inv.email}</p>
                  <p className="text-xs text-muted-foreground">
                    Invited as {inv.role} · Expires {format(inv.expiresAt, "MMM d")}
                  </p>
                </div>
                <Badge variant="outline">Pending</Badge>
              </div>
            ))}
          </CardContent>
        </Card>
      )}
    </div>
  );
}
