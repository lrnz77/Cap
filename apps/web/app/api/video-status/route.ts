// apps/web/app/api/video-status/route.ts
import { NextResponse } from "next/server";
import mysql from "mysql2/promise";

// Pool MySQL (riusa le ENV del webhook)
const pool = mysql.createPool({
  host: process.env.DB_HOST!,
  user: process.env.DB_USER!,
  password: process.env.DB_PASSWORD!,
  database: process.env.DB_NAME!,
  waitForConnections: true,
  connectionLimit: 5,
  queueLimit: 0,
});

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

    const ready = video.jobStatus === "ready";
    return NextResponse.json({
      ok: true,
      id: video.id,
      jobStatus: video.jobStatus,
      ready,
      updatedAt: video.updatedAt,
    });
  } catch (err) {
    console.error("Error in /api/video-status:", err);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}
