// pages/api/minio-hook.ts
import type { NextApiRequest, NextApiResponse } from "next";
import mysql from "mysql2/promise";

/**
 * Webhook MinIO → Capso
 * - Verifica token (?token=...).
 * - Estrae videoId dal key S3 (es: "cc28vrbz8kb3y0c/result.mp4").
 * - Aggiorna DB: videos.jobStatus = 'ready' dove id = videoId.
 * - Idempotente: eseguire più volte non crea problemi.
 */

const pool = mysql.createPool(process.env.DATABASE_URL!);

type MinioRecord = {
  eventName?: string;
  s3?: {
    bucket?: { name?: string };
    object?: { key?: string };
  };
};

export const config = {
  api: {
    // manteniamo il parser di default (JSON)
    bodyParser: true,
    externalResolver: true,
  },
};

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  // Health check semplice
  if (req.method === "GET") {
    return res.status(200).json({ ok: true, message: "minio-hook up" });
  }

  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method Not Allowed" });
  }

  // 🔐 Auth via token querystring
  const { token } = req.query;
  if (!process.env.MINIO_WEBHOOK_TOKEN) {
    return res.status(500).json({ error: "Server token not configured" });
  }
  if (token !== process.env.MINIO_WEBHOOK_TOKEN) {
    return res.status(401).json({ error: "Unauthorized" });
  }

  try {
    const records: MinioRecord[] = (req.body && (req.body.Records as MinioRecord[])) || [];
    if (!Array.isArray(records) || records.length === 0) {
      return res.status(400).json({ error: "Invalid payload: missing Records" });
    }

    // Gestiamo il primo record (MinIO invia 1 alla volta per put/copymultipart)
    const rec = records[0];
    const rawKey = rec?.s3?.object?.key || "";
    if (!rawKey) {
      return res.status(400).json({ error: "Invalid payload: missing object.key" });
    }

    // Key può essere url-encoded (spazi, %2F, ecc.)
    const key = safeDecode(rawKey);

    // Atteso: "<videoId>/result.mp4" (eventuali sottocartelle sono ok: "<videoId>/.../result.mp4")
    const videoId = key.split("/")[0];
    if (!videoId) {
      return res.status(400).json({ error: "Unable to extract videoId from key", key });
    }

    // Aggiorna stato → 'ready'
    // (se vuoi anche aggiornare updatedAt lato DB, aggiungi ", updatedAt = NOW()" alla query)
    const [result] = await pool.query(
      "UPDATE `videos` SET `jobStatus` = 'ready' WHERE `id` = ?",
      [videoId]
    );

    // Log minimale server-side
    // console.log("HOOK hit", { key, videoId, event: rec?.eventName });

    return res.status(200).json({
      ok: true,
      videoId,
      key,
    });
  } catch (err: any) {
    console.error("Errore nel webhook MinIO:", err?.message || err);
    return res.status(500).json({ error: "Internal Server Error" });
  }
}

/** Decodifica sicura senza far esplodere la route per malformed encodings */
function safeDecode(s: string): string {
  try {
    return decodeURIComponent(s.replace(/\+/g, " "));
  } catch {
    return s;
  }
}
