import { NextApiRequest, NextApiResponse } from "next";
import { connectToDatabase } from "@/lib/MongoDB";
import { ObjectId } from "mongodb";

export default async function updateActivityLog(
  req: NextApiRequest,
  res: NextApiResponse
) {
  if (req.method !== "PUT") {
    res.setHeader("Allow", ["PUT"]);
    return res.status(405).end(`Method ${req.method} Not Allowed`);
  }

  try {
    const { _id, Remarks } = req.body;

    if (!_id || Remarks === undefined) {
      return res.status(400).json({ error: "Missing required fields" });
    }

    const db = await connectToDatabase();
    const activityLogsCollection = db.collection("TaskLog");

    const result = await activityLogsCollection.updateOne(
      { _id: new ObjectId(_id) },
      {
        $set: {
          Remarks,
          updatedAt: new Date(),
        },
      }
    );

    if (result.matchedCount === 0) {
      return res.status(404).json({ error: "Activity log not found" });
    }

    return res.status(200).json({ message: "Activity log updated successfully" });
  } catch (error) {
    console.error("Error updating activity log:", error);
    return res.status(500).json({ error: "Failed to update activity log" });
  }
}
