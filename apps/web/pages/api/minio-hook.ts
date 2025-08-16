import type { NextApiRequest, NextApiResponse } from "next";

/**
 * Webhook endpoint chiamato da MinIO quando avviene un evento (es. upload).
 * Configuralo in MinIO Client con:
 *   mc event add myminio/bucket arn:minio:sqs::minio:webhook --event put
 */
export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== "POST") {
    return res.status(405).json({ message: "Method Not Allowed" });
  }

  try {
    console.log("Evento MinIO ricevuto:", req.body);

    // Qui aggiungi la logica che ti serve (es. salvare su DB, triggerare un job, ecc.)

    return res.status(200).json({ ok: true });
  } catch (error: any) {
    console.error("Errore nel webhook:", error);
    return res.status(500).json({ error: "Internal Server Error" });
  }
}
