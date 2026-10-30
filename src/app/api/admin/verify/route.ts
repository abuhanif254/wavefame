import { NextResponse } from "next/server";
import { verifyAdminRequest } from "@/lib/auth/adminGuard";

export async function POST(req: Request) {
  const auth = verifyAdminRequest(req);
  if (!auth.authorized) {
    return NextResponse.json({ error: auth.error || "Unauthorized" }, { status: 401 });
  }

  return NextResponse.json({ success: true, message: "Admin authenticated." });
}
