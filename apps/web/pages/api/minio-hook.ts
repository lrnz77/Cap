// apps/web/pages/api/minio-hook.ts
import type { NextApiRequest, NextApiResponse } from "next";
import mysql from "mysql2/promise";

const TOKEN = process.env.MINIO_WEBHOOK_TOKEN || "";

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== "POST") return res.status(405).json({ message: "Method Not Allowed" });
  if ((req.query.token as string) !== TOKEN) return res.status(401).json({ error: "unauthorized" });

  try {
    const body = typeof req.body === "string" ? JSON.parse(req.body) : req.body;
    const rec = body?.Records?.[0];
    if (!rec) return res.status(400).json({ error: "no-records" });

    const event = String(rec.eventName || "");
    const bucket = rec?.s3?.bucket?.name as string;
    const objectKeyRaw = rec?.s3?.object?.key || "";
    const objectKey = decodeURIComponent(objectKeyRaw);

    // Consideriamo PRONTO solo al termine upload (put o multipart complete)
    const isComplete = event.includes("ObjectCreated:Put") || event.includes("CompleteMultipartUpload");
    if (!isComplete || bucket !== "cap-uploads" || !objectKey) {
      return res.status(200).json({ ignored: true, event, bucket, objectKey });
    }

    // es: pdc7qg8qrqj1r1k/qualcosa/result.mp4 -> prende "pdc7qg8qrqj1r1k"
    const videoId = objectKey.split("/")[0];
    if (!videoId || videoId.length < 8) {
      return res.status(200).json({ ignored: true, reason: "no videoId", objectKey });
    }

    // Connessione MySQL usando DATABASE_URL (quella che hai già)
    const pool = await mysql.createPool(process.env.DATABASE_URL as string);
    const [r] = await pool.execute(
      `UPDATE videos SET jobStatus='ready', updatedAt=NOW() WHERE id=? LIMIT 1`,
      [videoId]
    );
    await pool.end();

    return res.status(200).json({ ok: true, updated: (r as any).affectedRows, videoId, event });
  } catch (e: any) {
    console.error("minio-hook error", e?.message);
    return res.status(500).json({ error: "internal" });
  }
}
