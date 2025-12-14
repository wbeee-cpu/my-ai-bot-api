console.log("WEBHOOK_VERSION = OPENAI_SAFE_V1");

export default async function handler(req, res) {
  // LINE 只會 POST
  if (req.method !== "POST") {
    return res.status(405).send("Method Not Allowed");
  }

  try {
    const events = req.body?.events ?? [];
    console.log("events length:", events.length);

    for (const event of events) {
      // 只處理「文字訊息」
      if (event?.type !== "message") continue;
      if (event?.message?.type !== "text") continue;

      const replyToken = event.replyToken;
      const userText = event.message.text;

      console.log("incoming text:", userText);

      // === OpenAI fallback 預設值（保命線） ===
      let aiText = "目前系統忙碌，請稍後再試，或留下您的需求。";

      // === 呼叫 OpenAI（安全版） ===
      try {
        const controller = new AbortController();
        const timeout = setTimeout(() => controller.abort(), 8000); // 8 秒超時

        const oa = await fetch("https://api.openai.com/v1/responses", {
          method: "POST",
          signal: controller.signal,
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

        clearTimeout(timeout);

        const oaJson = await oa.json();
        console.log("openai status:", oa.status);

        if (oa.ok) {
          aiText =
            oaJson?.output?.[0]?.content?.[0]?.text ||
            oaJson?.output_text ||
            aiText;
        } else {
          console.log("openai error:", JSON.stringify(oaJson));
        }
      } catch (oaErr) {
        console.log("openai exception:", String(oaErr));
        // aiText 保持 fallback
      }

      // === 回覆 LINE（一定要做） ===
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

    // 一定回 200，避免 LINE 重送
    return res.status(200).json({ ok: true });
  } catch (err) {
    console.error("webhook fatal error:", err);
    // 就算炸了，也要回 200
    return res.status(200).json({ ok: true });
  }
}
