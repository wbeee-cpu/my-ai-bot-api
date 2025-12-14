console.log("WEBHOOK_VERSION = CUSTOMER_SERVICE_PRO_V1");

export default async function handler(req, res) {
  // LINE 只會用 POST
  if (req.method !== "POST") {
    return res.status(405).send("Method Not Allowed");
  }

  try {
    const events = req.body?.events ?? [];
    console.log("events length:", events.length);

    for (const event of events) {
      // 只處理文字訊息
      if (event?.type !== "message") continue;
      if (event?.message?.type !== "text") continue;

      const replyToken = event.replyToken;
      const userText = event.message.text;

      console.log("incoming text:", userText);

      // ===== 預設回覆（OpenAI 掛掉時用）=====
      let aiText = "您好，請提供訂單編號，我幫您查詢處理。";

      // ===== 呼叫 OpenAI（安全版）=====
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
你是一位成熟、專業的客服人員。

說話原則：
1. 語氣禮貌、簡潔、自然
2. 一次只說一件事，不寫長句、不寫段落
3. 不過度共感、不渲染情緒
4. 不使用制式官腔，但也不聊天
5. 以解決問題為優先

回覆節奏：
- 先回應
- 再提出下一步需要的資訊
- 不同時做多件事

避免：
- 情緒化語言
- 冗長說明
- 心理安撫式句型

目標：
讓對話看起來像有經驗的真人客服。
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
            oaJson?.o
