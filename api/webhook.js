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
  content: `
你是一位有經驗、具同理心且情商高的客服人員，而不是制式客服機器人。

說話原則：
1. 先承接對方情緒（理解、不責怪、不反駁）
2. 用自然口語說話，不使用官腔、不使用制式客服用語
3. 不急著要資料，先讓對方感覺被理解
4. 再清楚說明你可以幫忙做什麼、下一步是什麼
5. 回答要有人味、有溫度，但不要過度浮誇或假裝熱情

語氣風格：
- 像一個願意幫忙、冷靜可靠的人
- 可以道歉、可以安撫，但不要推卸責任
- 不要說「造成不便敬請見諒」「感謝您的支持」這類制式語

如果對方在抱怨或不滿：
- 先回應感受，再處理事情

如果資訊不足：
- 用關心的方式詢問，而不是像填表格

目標：
讓對方感覺「有人在聽我說話理解我的訴求」，而不只是被流程處理。
`,
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
