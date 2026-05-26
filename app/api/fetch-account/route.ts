import { NextResponse } from "next/server";
import { neon } from "@neondatabase/serverless";

const DATABASE_URL = process.env.TASKFLOW_DB;
if (!DATABASE_URL) {
  // ✅ FIX 1: Error message now matches the actual env variable name
  throw new Error("TASKFLOW_DB is not set");
}

const sql = neon(DATABASE_URL);

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const referenceid = searchParams.get("referenceid");

    if (!referenceid) {
      return NextResponse.json(
        { success: false, error: "Missing referenceid" },
        { status: 400 }
      );
    }

    const accounts = await sql`
      SELECT company_name
      FROM accounts
      WHERE referenceid = ${referenceid};
    `;

    // ✅ FIX 2: Return count explicitly so frontend doesn't rely on fallback
    return NextResponse.json(
      {
        success: true,
        data: accounts,
        count: accounts.length,
      },
      {
        status: 200,
        // ✅ FIX 3: Removed Cache-Control — force-dynamic already
        // means Next.js won't cache, and browser caching stale
        // account lists causes the count badge to show wrong numbers
      }
    );
  } catch (error: any) {
    console.error("Accounts API error:", error);
    return NextResponse.json(
      { success: false, error: "Failed to fetch accounts" },
      { status: 500 }
    );
  }
}

// Still dynamic — no Next.js-level caching
export const dynamic = "force-dynamic";
