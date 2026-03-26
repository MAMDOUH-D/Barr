// api/notify.js — Vercel Serverless Function
// Called by cron job every minute to check for late medications

const FIREBASE_SERVER_KEY = "BMeN4RL9Xq1r-ch7DJMtDjNV8fCL1rEKKxvV-u06dTAccCByejjsDvzAq6AQsvtBfUs-E-11okLnMeUYmAhxi88";
const FIREBASE_PROJECT_ID = "barr-73df3";
const FIREBASE_API_KEY = "AIzaSyAivsLIktDqF2OCd8clRsIi3NNvrAh80b0";

const getToday = () => new Date().toISOString().split("T")[0];
const getNowMins = () => {
  const now = new Date();
  return now.getHours() * 60 + now.getMinutes();
};

// Fetch from Firestore REST API
async function fbGet(key) {
  try {
    const url = `https://firestore.googleapis.com/v1/projects/${FIREBASE_PROJECT_ID}/databases/(default)/documents/barr/${key}?key=${FIREBASE_API_KEY}`;
    const res = await fetch(url);
    if (!res.ok) return null;
    const data = await res.json();
    return data?.fields?.value?.stringValue || null;
  } catch (e) { return null; }
}

// Send FCM notification to all tokens
async function sendToAll(tokens, title, body) {
  if (!tokens || tokens.length === 0) return;
  const results = await Promise.all(tokens.map(token =>
    fetch("https://fcm.googleapis.com/fcm/send", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `key=${FIREBASE_SERVER_KEY}`
      },
      body: JSON.stringify({
        to: token,
        notification: { title, body, icon: "/icon-192.png" },
        data: { url: "https://barr-gamma.vercel.app" }
      })
    })
  ));
  return results;
}

export default async function handler(req, res) {
  // Allow POST for direct calls and GET for cron
  if (req.method !== "GET" && req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  try {
    const today = getToday();
    const nowMins = getNowMins();

    // Get all FCM tokens
    const tokensData = await fbGet("fcm_tokens");
    const tokens = tokensData ? Object.values(JSON.parse(tokensData)) : [];

    if (tokens.length === 0) {
      return res.status(200).json({ message: "No tokens registered", tokens: 0 });
    }

    // If direct notification request (POST with title/body)
    if (req.method === "POST" && req.body?.title) {
      await sendToAll(tokens, req.body.title, req.body.body || "");
      return res.status(200).json({ message: "Notification sent", tokens: tokens.length });
    }

    // Cron: check for late medications
    const [schedData, logsData] = await Promise.all([
      fbGet("schedule"),
      fbGet(`logs_${today}`)
    ]);

    const schedule = schedData ? JSON.parse(schedData) : [];
    const logs = logsData ? JSON.parse(logsData) : {};

    const lateItems = [];
    for (const item of schedule) {
      if (logs[item.id]) continue;
      const [h, m] = item.time.split(":").map(Number);
      const itemMins = h * 60 + m;
      const diff = nowMins - itemMins;
      if (diff >= 60 && diff < 70) {
        lateItems.push(item);
      }
    }

    if (lateItems.length > 0) {
      for (const item of lateItems) {
        await sendToAll(
          tokens,
          `⚠️ بار — تأخر`,
          `لم يُعطَ ${item.name} للوالد منذ أكثر من ساعة`
        );
      }
    }

    return res.status(200).json({
      message: "Cron check done",
      tokens: tokens.length,
      lateItems: lateItems.length
    });

  } catch (e) {
    return res.status(500).json({ error: e.message });
  }
}
