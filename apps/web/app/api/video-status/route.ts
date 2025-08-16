// apps/web/app/api/video-status/route.ts
import { NextResponse } from "next/server";
import mysql from "mysql2/promise";

// usa direttamente la stringa di connessione DATABASE_URL
// es: mysql://user:pass@host:3306/dbname
const url = process.env.DATABASE_URL!;
if (!url) {
  console.error("Missing DATABASE_URL env");
}

// mysql2 accetta la connection string direttamente
const pool = mysql.createPool(url);

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const id = searchParams.get("id");
    if (!id) {
      return NextResponse.json({ error: "Missing id" }, { status: 400 });
    }

    const [rows] = await pool.query(
      "SELECT id, jobStatus, updatedAt FROM videos WHERE id = ? LIMIT 1",
      [id]
    );

    const video = Array.isArray(rows) && rows.length ? (rows as any)[0] : null;
    if (!video) {
      return NextResponse.json({ error: "Not found" }, { status: 404 });
    }

    return NextResponse.json({
      ok: true,
      id: video.id,
      jobStatus: video.jobStatus,
      ready: video.jobStatus === "ready",
      updatedAt: video.updatedAt,
    });
  } catch (err: any) {
    console.error("Error in /api/video-status:", err?.message || err);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}
