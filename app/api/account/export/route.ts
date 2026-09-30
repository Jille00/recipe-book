import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { enforceRateLimit } from "@/lib/rate-limit";
import { loadAccountExportSource } from "@/lib/db/queries/account";
import { accountExportFileName, buildAccountExport } from "@/lib/account-export";

/**
 * GET /api/account/export - the signed-in user's own data as a JSON download.
 */
export async function GET(request: NextRequest) {
  try {
    const session = await auth.api.getSession({ headers: request.headers });
    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const limited = await enforceRateLimit("account:export", session.user.id);
    if (limited) return limited;

    const source = await loadAccountExportSource(session.user.id);
    if (!source) {
      return NextResponse.json({ error: "Account not found" }, { status: 404 });
    }

    const exportedAt = new Date();
    const body = JSON.stringify(buildAccountExport(source, exportedAt), null, 2);

    return new NextResponse(body, {
      status: 200,
      headers: {
        "Content-Type": "application/json; charset=utf-8",
        "Content-Disposition": `attachment; filename="${accountExportFileName(exportedAt)}"`,
        // Personal data: never keep it in a shared or browser cache.
        "Cache-Control": "private, no-store",
      },
    });
  } catch (error) {
    console.error("Error exporting account data:", error);
    return NextResponse.json({ error: "Failed to export your data" }, { status: 500 });
  }
}
