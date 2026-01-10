import { NextApiRequest, NextApiResponse } from "next";
import { connectToDatabase } from "@/lib/MongoDB";

export default async function addActivityLog(
  req: NextApiRequest,
  res: NextApiResponse
) {
  if (req.method !== "POST") {
    res.setHeader("Allow", ["POST"]);
    return res.status(405).end(`Method ${req.method} Not Allowed`);
  }

  try {
    const {
      ReferenceID,
      Email,
      Type,
      Status,
      Location,
      Latitude,
      Longitude,
      PhotoURL,
      SitePhotoURL,
      SiteVisitAccount,
      Remarks,
      TSM,
    } = req.body;

    if (!ReferenceID || !Email || !Type || !Status) {
      return res.status(400).json({ error: "Missing required fields" });
    }

    const db = await connectToDatabase();
    const activityLogsCollection = db.collection("TaskLog");

    /* 🕒 8:00 AM DAY WINDOW (AUTO RESET) */
    const now = new Date();

    const startOfDay = new Date(now);
    startOfDay.setHours(8, 0, 0, 0);

    if (now < startOfDay) {
      startOfDay.setDate(startOfDay.getDate() - 1);
    }

    const endOfDay = new Date(startOfDay);
    endOfDay.setDate(endOfDay.getDate() + 1);
    endOfDay.setMilliseconds(-1);

    /* 🔍 LAST ACTIVITY */
    const lastActivityToday = await activityLogsCollection.findOne(
      {
        ReferenceID,
        date_created: {
          $gte: startOfDay,
          $lte: endOfDay,
        },
      },
      { sort: { date_created: -1 } }
    );

    /* 🔒 PREVENT SAME STATUS TWICE */
    if (lastActivityToday?.Status === Status) {
      return res.status(409).json({
        error: `You are already ${Status.toLowerCase()}.`,
      });
    }

    /* 🚫 LOGIN LIMIT: MAX 10 LOGINS PER DAY */
    if (Status === "Login") {
      const loginCount = await activityLogsCollection.countDocuments({
        ReferenceID,
        Status: "Login",
        date_created: {
          $gte: startOfDay,
          $lte: endOfDay,
        },
      });

      if (loginCount >= 10) {
        return res.status(403).json({
          error: "Daily 10 Login limit reached. Resets at 8:00 AM.",
        });
      }
    }

    /* 🚫 SITE VISIT LIMIT */
    if (Type === "Site Visit") {
      const siteVisitCount = await activityLogsCollection.countDocuments({
        ReferenceID,
        Type: "Site Visit",
        date_created: {
          $gte: startOfDay,
          $lte: endOfDay,
        },
      });

      if (siteVisitCount >= 10) {
        return res.status(403).json({
          error: "Daily 10 Site Visit limit reached. Resets at 8:00 AM.",
        });
      }
    }

    /* 📌 INSERT LOG */
    const newLog: any = {
      ReferenceID,
      Email,
      Type,
      Status,
      Remarks,
      TSM,
      SiteVisitAccount,
      date_created: new Date(),
    };

    if (Location) newLog.Location = Location;
    if (Latitude) newLog.Latitude = Latitude;
    if (Longitude) newLog.Longitude = Longitude;
    if (PhotoURL) newLog.PhotoURL = PhotoURL;
    if (SitePhotoURL) newLog.SitePhotoURL = SitePhotoURL;

    const result = await activityLogsCollection.insertOne(newLog);

    if (!result.acknowledged) {
      throw new Error("Failed to insert new log");
    }

    return res.status(201).json({
      message: `${Status} recorded successfully`,
    });
  } catch (error) {
    console.error("Error adding activity log:", error);
    return res.status(500).json({ error: "Failed to add activity log" });
  }
}
