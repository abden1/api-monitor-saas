import { NextRequest } from "next/server";
import { db } from "@/lib/db";
import bcrypt from "bcryptjs";

export interface ApiKeyContext {
  teamId: string;
  scopes: string[];
  keyId: string;
}

export async function validateApiKey(req: NextRequest): Promise<ApiKeyContext | null> {
  const authHeader = req.headers.get("Authorization");
  if (!authHeader?.startsWith("Bearer ")) return null;

  const token = authHeader.slice(7);
  if (!token.startsWith("am_")) return null;

  const prefix = token.slice(0, 8);

  const keys = await db.apiKey.findMany({
    where: {
      keyPrefix: prefix,
      OR: [{ expiresAt: null }, { expiresAt: { gt: new Date() } }],
    },
  });

  for (const key of keys) {
    const isValid = await bcrypt.compare(token, key.keyHash);
    if (isValid) {
      await db.apiKey.update({
        where: { id: key.id },
        data: { lastUsedAt: new Date() },
      });

      return {
        teamId: key.teamId,
        scopes: key.scopes,
        keyId: key.id,
      };
    }
  }

  return null;
}

export function hasScope(ctx: ApiKeyContext, scope: string): boolean {
  return ctx.scopes.includes(scope) || ctx.scopes.includes("admin");
}
