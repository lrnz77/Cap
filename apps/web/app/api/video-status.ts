import type { NextApiRequest, NextApiResponse } from "next";

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== "GET") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  try {
    const { id } = req.query;

    if (!id || typeof id !== "string") {
      return res.status(400).json({ error: "Missing or invalid video ID" });
    }

    // Qui in futuro puoi collegare la logica reale (es. db, servizio esterno, ecc.)
    // Per ora è solo un mock di risposta
    return res.status(200).json({
      id,
      status: "processing", // valori possibili: processing, ready, failed
      progress: 42, // percentuale completamento mock
    });
  } catch (error) {
    console.error("Error in /api/video-status:", error);
    return res.status(500).json({ error: "Internal server error" });
  }
}
