// pages/api/video-status.ts
import type { NextApiRequest, NextApiResponse } from "next";
import mysql from "mysql2/promise";

const pool = mysql.createPool(process.env.DATABASE_URL!);

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  try {
    const id = (req.query.id as string) || "";
    if (!id) return res.status(400).json({ ok: false, error: "Missing id" });

    const [rows] = await pool.query("SELECT jobStatus FROM videos WHERE id = ? LIMIT 1", [id]);
    const row: any = Array.isArray(rows) && rows[0] ? rows[0] : null;

    const jobStatus = row?.jobStatus ?? null;
    const ready = jobStatus === "ready";

    return res.status(200).json({ ok: true, ready, jobStatus });
  } catch (e: any) {
    return res.status(500).json({ ok: false, error: e?.message || "Internal error" });
  }
}
