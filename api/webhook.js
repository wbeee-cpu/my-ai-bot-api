console.log("WEBHOOK_VERSION = OPENAI_V1");

export default async function handler(req, res) {
  try {
    if (req.method !== "POST") return res.status(405).send("Method Not Allowed");

    const events = req.body?.events ?? [];
    console.log("events length:", events.length);

    for (const event of events) {
      if (event?.type !== "message") continue;
      if (event?.message?.type !== "text") continue;

      const replyToken = event.replyToken;
      const userText = event.message.text;

      // 先回 200，避免 LINE 重送
      //（注意：不能在 loop 裡 return，不然多事件會被截斷）
      // 這裡先不回，最後統一回
      console.log("incoming text:", userText);

      // 1) Call OpenAI (Responses API)
      const oa = await fetch("https://api.openai.com/v1/responses", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${process.env.OPENAI_API_KEY}`,
        },
        body: JSON.stringify({
          model: "gpt-4.1-mini",
          input: [
            {
              role: "system",
              content:
                "你是客服助理。回答要簡短、直接、可執行。遇到不確定要明確說不確定。",
            },
            { role: "user", content: userText },
          ],
        }),
      });

      const oaJson = await oa.json();
      const aiText =
        oaJson?.output?.[0]?.content?.[0]?.text ||
        oaJson?.output_text ||
        "我剛剛沒有拿到模型回覆，請再試一次。";

      console.log("openai status:", oa.status);
      if (!oa.ok) console.log("openai error:", JSON.stringify(oaJson));

      // 2) Reply to LINE
      const resp = await fetch("https://api.line.me/v2/bot/message/reply", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${process.env.LINE_CHANNEL_ACCESS_TOKEN}`,
        },
        body: JSON.stringify({
          replyToken,
          messages: [{ type: "text", text: aiText }],
        }),
      });

      const bodyText = await resp.text();
      console.log("LINE reply status:", resp.status);
      console.log("LINE reply body:", bodyText);
    }

    return res.status(200).json({ ok: true });
  } catch (err) {
    console.error("webhook error:", err);
    return res.status(200).json({ ok: true });
  }
}
