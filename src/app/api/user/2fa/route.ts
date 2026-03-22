import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import speakeasy from "speakeasy";
import QRCode from "qrcode";

export async function GET() {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const secret = speakeasy.generateSecret({ length: 32 });

  // Store secret temporarily (verified and finalized on POST)
  await db.user.update({
    where: { id: session.user.id },
    data: { totpSecret: secret.base32 },
  });

  // Build standard otpauth URL that all authenticator apps understand
  const issuer = "API Monitor";
  const account = encodeURIComponent(session.user.email!);
  const otpauthUrl = `otpauth://totp/${encodeURIComponent(issuer)}:${account}?secret=${secret.base32}&issuer=${encodeURIComponent(issuer)}&algorithm=SHA1&digits=6&period=30`;

  const qrCodeUrl = await QRCode.toDataURL(otpauthUrl);

  return NextResponse.json({ qrCode: qrCodeUrl, secret: secret.base32 });
}

export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { token, action } = await req.json();

  const user = await db.user.findUnique({ where: { id: session.user.id } });
  if (!user?.totpSecret) return NextResponse.json({ error: "No 2FA secret found" }, { status: 400 });

  if (action === "disable") {
    if (!user.totpEnabled) return NextResponse.json({ error: "2FA is not enabled" }, { status: 400 });

    const valid = speakeasy.totp.verify({
      secret: user.totpSecret,
      encoding: "base32",
      token,
      window: 1,
    });

    if (!valid) return NextResponse.json({ error: "Invalid token" }, { status: 400 });

    await db.user.update({
      where: { id: session.user.id },
      data: { totpEnabled: false, totpSecret: null },
    });

    return NextResponse.json({ success: true, enabled: false });
  }

  // Enable 2FA
  const valid = speakeasy.totp.verify({
    secret: user.totpSecret,
    encoding: "base32",
    token,
    window: 1,
  });

  if (!valid) return NextResponse.json({ error: "Invalid token. Please try again." }, { status: 400 });

  await db.user.update({
    where: { id: session.user.id },
    data: { totpEnabled: true },
  });

  return NextResponse.json({ success: true, enabled: true });
}
