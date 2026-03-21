"use client";
import Link from "next/link";
import { signOut } from "next-auth/react";
import { Activity, Bell, LogOut, Settings, User, Menu } from "lucide-react";
import { Button } from "@/components/ui/button";

interface TopbarProps {
  user: {
    name?: string | null;
    email?: string | null;
    image?: string | null;
    teamName?: string;
  };
}

export function Topbar({ user }: TopbarProps) {
  return (
    <header className="sticky top-0 z-40 border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
      <div className="flex h-16 items-center justify-between px-6">
        {/* Mobile menu trigger */}
        <button className="md:hidden p-2 rounded-md hover:bg-accent">
          <Menu className="h-5 w-5" />
        </button>

        <div className="flex items-center gap-4 ml-auto">
          <Button variant="ghost" size="icon" asChild>
            <Link href="/alerts">
              <Bell className="h-5 w-5" />
            </Link>
          </Button>

          <div className="flex items-center gap-3 border-l pl-4">
            <div className="text-right hidden sm:block">
              <p className="text-sm font-medium leading-none">{user.name || user.email}</p>
              {user.teamName && (
                <p className="text-xs text-muted-foreground mt-0.5">{user.teamName}</p>
              )}
            </div>
            <div className="flex items-center gap-1">
              <Button variant="ghost" size="icon" asChild>
                <Link href="/settings">
                  <Settings className="h-4 w-4" />
                </Link>
              </Button>
              <Button
                variant="ghost"
                size="icon"
                onClick={() => signOut({ callbackUrl: "/login" })}
              >
                <LogOut className="h-4 w-4" />
              </Button>
            </div>
          </div>
        </div>
      </div>
    </header>
  );
}
