export default async function handler(req, res) {
  if (req.method !== "POST") return res.status(405).end();

  const event = req.body?.events?.[0];

  // 先回 200，避免 LINE 重送
  res.status(200).json({ ok: true });

  if (!event || event.type !== "message" || event.message?.type !== "text") return;

  await fetch("https://api.line.me/v2/bot/message/reply", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${process.env.LINE_CHANNEL_ACCESS_TOKEN}`,
    },
    body: JSON.stringify({
      replyToken: event.replyToken,
      messages: [{ type: "text", text: `收到：${event.message.text}` }],
    }),
  });
}
