export default async function handler(req, res) {
  try {
    if (req.method !== "POST") return res.status(405).send("Method Not Allowed");

    const events = req.body?.events ?? [];
    console.log("events length:", events.length);
    console.log("first event:", JSON.stringify(events[0] ?? null));

    for (const event of events) {
      // 只處理文字訊息
      if (event?.type !== "message") continue;
      if (event?.message?.type !== "text") continue;

      const replyToken = event.replyToken;
      const text = event.message.text;

      console.log("replyToken exists:", Boolean(replyToken));
      console.log("incoming text:", text);

      const resp = await fetch("https://api.line.me/v2/bot/message/reply", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${process.env.LINE_CHANNEL_ACCESS_TOKEN}`,
        },
        body: JSON.stringify({
          replyToken,
          messages: [{ type: "text", text: `收到：${text}` }],
        }),
      });

      const bodyText = await resp.text();
      console.log("LINE reply status:", resp.status);
      console.log("LINE reply body:", bodyText);
    }

    // 最後一定回 200 給 LINE（避免重送）
    return res.status(200).json({ ok: true });
  } catch (err) {
    console.error("webhook error:", err);
    return res.status(200).json({ ok: true }); // 仍回 200，避免 LINE 狂重送
  }
}
