import type { NextApiRequest, NextApiResponse } from "next";
import mysql from "mysql2/promise";

// Connessione MySQL (riusa variabili ENV già definite in .env)
const pool = mysql.createPool({
  host: process.env.DB_HOST!,
  user: process.env.DB_USER!,
  password: process.env.DB_PASSWORD!,
  database: process.env.DB_NAME!,
});

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== "POST") {
    return res.status(405).json({ message: "Method Not Allowed" });
  }

  // 🔐 Verifica token
  const { token } = req.query;
  if (token !== process.env.MINIO_WEBHOOK_TOKEN) {
    return res.status(401).json({ error: "Unauthorized" });
  }

  try {
    console.log("Evento MinIO ricevuto:", req.body);

    const record = req.body?.Records?.[0];
    if (!record) {
      return res.status(400).json({ error: "Invalid payload" });
    }

    // esempio: pdc7qg8qrqj1r1k/test/result.mp4
    const objectKey = record.s3?.object?.key || "";
    const videoId = objectKey.split("/")[0]; // prendi la prima parte del path

    if (!videoId) {
      return res.status(400).json({ error: "Missing videoId" });
    }

    // Aggiorna DB
    await pool.query("UPDATE videos SET jobStatus=? WHERE id=?", ["ready", videoId]);

    return res.status(200).json({ ok: true, videoId });
  } catch (error) {
    console.error("Errore nel webhook:", error);
    return res.status(500).json({ error: "Internal Server Error" });
  }
}
