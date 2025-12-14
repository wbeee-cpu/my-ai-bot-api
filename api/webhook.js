console.log("WEBHOOK_VERSION = CUSTOMER_SERVICE_PRO_V2_CJS");

module.exports = async function handler(req, res) {
  if (req.method !== "POST") {
    res.statusCode = 405;
    return res.end("Method Not Allowed");
  }

  try {
    const events = (req.body && req.body.events) ? req.body.events : [];
    console.log("events length:", events.length);

    for (const event of events) {
      if (!event || event.type !== "message") continue;
      if (!event.message || event.message.type !== "text") continue;

      const replyToken = event.replyToken;
      const userText = event.message.text;
      console.log("incoming text:", userText);

      // 1) 預設 fallback：OpenAI 任何問題都回這句
      let aiText = "好的，請提供訂單編號，我幫您查詢配送狀態。";

      // 2) OpenAI：最多 2.5 秒，超過就直接用 fallback
      try {
        const controller = new AbortController();
        const timeout = setTimeout(() => controller.abort(), 2500);

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
                  "你是一位成熟、專業的客服人員。語氣禮貌、簡潔、自然；一次只說一件事；不過度共感、不渲染情緒；不使用制式官腔但也不閒聊；以解決問題為優先。資訊不足時用一句話請對方提供必要資訊。",
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
            (oaJson.output &&
              oaJson.output[0] &&
              oaJson.output[0].content &&
              oaJson.output[0].content[0] &&
              oaJson.output[0].content[0].text) ||
            oaJson.output_text ||
            aiText;
        } else {
          console.log("openai error:", JSON.stringify(oaJson));
          // aiText 保持 fallback
        }
      } catch (oaErr) {
        console.log("openai exception:", String(oaErr));
        // aiText 保持 fallback
      }

      // 3) 回 LINE（一定要做 + 印出失敗原因）
      try {
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
      } catch (lineErr) {
        console.log("LINE reply exception:", String(lineErr));
      }
    }

    res.statusCode = 200;
    return res.end(JSON.stringify({ ok: true }));
  } catch (err) {
    console.error("webhook fatal error:", err);
    res.statusCode = 200;
    return res.end(JSON.stringify({ ok: true }));
  }
};
