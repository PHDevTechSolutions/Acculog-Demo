import { NextApiRequest, NextApiResponse } from "next";
import { serialize } from "cookie";
import { connectToDatabase } from "@/lib/MongoDB";
import { validateUser } from "@/lib/MongoDB"; // for password login

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  const { Email, Password, credentialId, deviceId } = req.body;

  if (!Email || !deviceId) {
    return res.status(400).json({ message: "Email and deviceId are required." });
  }

  const db = await connectToDatabase();
  const usersCollection = db.collection("users");

  // Find the user by email
  const user = await usersCollection.findOne({ Email });

  if (!user) {
    return res.status(401).json({ message: "Invalid credentials." });
  }

  // --- WebAuthn (Fingerprint) Login ---
  if (credentialId && !Password) {
    // This assumes you're storing WebAuthn credential ID under user.credentials
    const storedCredId = user?.credentials?.[0]?.id;

    if (!storedCredId) {
      return res.status(400).json({ message: "No WebAuthn credential found for this user." });
    }

    if (storedCredId !== credentialId) {
      return res.status(401).json({ message: "Invalid fingerprint credential." });
    }

    // Fingerprint (WebAuthn) is valid, save deviceId and set cookie
    const userId = user._id.toString();

    await usersCollection.updateOne(
      { Email },
      { $set: { DeviceId: deviceId } }
    );

    res.setHeader(
      "Set-Cookie",
      serialize("session", userId, {
        httpOnly: true,
        secure: process.env.NODE_ENV !== "development",
        sameSite: "strict",
        maxAge: 60 * 60 * 24, // 1 day
        path: "/",
      })
    );

    return res.status(200).json({
      message: "Fingerprint login successful",
      userId,
    });
  }

  // --- Password Login ---
  if (!Password) {
    return res.status(400).json({ message: "Password is required for normal login." });
  }

  const result = await validateUser({ Email, Password });

  if (!result.success || !result.user) {
    return res.status(401).json({ message: "Invalid credentials." });
  }

  // Save deviceId on successful login
  await usersCollection.updateOne(
    { Email },
    { $set: { DeviceId: deviceId } }
  );

  const userId = result.user._id.toString();

  res.setHeader(
    "Set-Cookie",
    serialize("session", userId, {
      httpOnly: true,
      secure: process.env.NODE_ENV !== "development",
      sameSite: "strict",
      maxAge: 60 * 60 * 24, // 1 day
      path: "/",
    })
  );

  return res.status(200).json({
    message: "Login successful",
    userId,
  });
}
