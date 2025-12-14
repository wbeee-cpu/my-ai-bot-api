import crypto from "crypto";

export default async function handler(req, res) {
  if (req.method !== "POST") return res.status(200).send("OK");

  const channelSecret = process.env.LINE_CHANNEL_SECRET;
  const accessToken = process.env.LINE_CHANNEL_ACCESS_TOKEN;

  const signature = req.headers["x-line-signature"];
  const bodyText = JSON.stringify(req.body);

  const hash = crypto
    .createHmac("sha256", channelSecret)
    .update(bodyText)
    .digest("base64");

  if (hash !== signature) return res.status(401).send("Invalid signature");

  const event = req.body?.events?.[0];
  const replyToken = event?.replyToken;
  const userText = event?.message?.text;

  if (!replyToken) return res.status(200).json({ ok: true });

  await fetch("https://api.line.me/v2/bot/message/reply", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${accessToken}`,
    },
    body: JSON.stringify({
      replyToken,
      messages: [
        { type: "text", text: `收到：${userText ?? "事件"}` },
      ],
    }),
  });

  return res.status(200).json({ ok: true });
}
