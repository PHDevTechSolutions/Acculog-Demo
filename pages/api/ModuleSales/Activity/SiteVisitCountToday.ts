// pages/api/ModuleSales/Activity/SiteVisitCountToday.ts
import { NextApiRequest, NextApiResponse } from "next";
import { connectToDatabase } from "@/lib/MongoDB";

export default async function siteVisitCountToday(
  req: NextApiRequest,
  res: NextApiResponse
) {
  if (req.method !== "GET") {
    res.setHeader("Allow", ["GET"]);
    return res.status(405).end(`Method ${req.method} Not Allowed`);
  }

  try {
    const { referenceId } = req.query;

    if (!referenceId || typeof referenceId !== "string") {
      return res.status(400).json({ error: "referenceId is required" });
    }

    const db = await connectToDatabase();
    const collection = db.collection("TaskLog");

    /* 🕒 TODAY RANGE */
    const startOfToday = new Date();
    startOfToday.setHours(0, 0, 0, 0);

    const endOfToday = new Date();
    endOfToday.setHours(23, 59, 59, 999);

    /* 🔢 COUNT COMPLETED SITE VISITS */
    const count = await collection.countDocuments({
      ReferenceID: referenceId,
      Type: "Site Visit",
      Status: "Logout", // completed visit
      date_created: {
        $gte: startOfToday,
        $lte: endOfToday,
      },
    });

    return res.status(200).json({ count });
  } catch (error) {
    console.error("Error counting site visits:", error);
    return res.status(500).json({ error: "Failed to count site visits" });
  }
}
