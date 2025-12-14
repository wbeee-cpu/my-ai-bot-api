console.log("BOOT VERSION 2025-01-AI");

const crypto = require("crypto");
const fetch = require("node-fetch");

module.exports = async (req, res) => {
  if (req.method !== "POST") return res.status(200).send("OK");

  const channelSecret = process.env.LINE_CHANNEL_SECRET;
  const accessToken = process.env.LINE_CHANNEL_ACCESS_TOKEN;
  const openaiKey = process.env.OPENAI_API_KEY;

  if (!channelSecret) return res.status(500).send("Missing LINE_CHANNEL_SECRET");
  if (!accessToken) return res.status(500).send("Missing LINE_CHANNEL_ACCESS_TOKEN");
  if (!openaiKey) return res.status(500).send("Missing OPENAI_API_KEY");

  // LINE signature verify
  const signature = req.headers["x-line-signature"];
  const bodyText = JSON.stringify(req.body);
  const hash = crypto.createHmac("sha256", channelSecret).update(bodyText).digest("base64");
  if (hash !== signature) return res.status(401).send("Invalid signature");

  const event = req.body?.events?.[0];
  const replyToken = event?.replyToken;
  if (!replyToken) return res.status(200).json({ ok: true, note: "no replyToken" });

  const userText =
    event?.message?.type === "text" ? event.message.text : "(non-text message)";

  // OpenAI Responses API: POST https://api.openai.com/v1/responses :contentReference[oaicite:1]{index=1}
  let aiText = "目前系統忙碌，請稍後再試。";
  try {
    const r = await fetch("https://api.openai.com/v1/responses", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${openaiKey}`,
      },
      body: JSON.stringify({
        model: "gpt-4.1-mini",
        instructions:
          "你是客服助理。用繁體中文回答。精簡、直接，必要時先問1個關鍵問題。避免廢話。",
        input: userText,
        max_output_tokens: 300,
      }),
    });

    const data = await r.json();
    aiText = data.output_text || aiText;
    console.log("OPENAI_STATUS:", r.status);
  } catch (e) {
    console.log("OPENAI_ERROR:", String(e));
  }

  // LINE Reply API
  await fetch("https://api.line.me/v2/bot/message/reply", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${accessToken}`,
    },
    body: JSON.stringify({
      replyToken,
      messages: [
        {
          type: "text",
          text: String(aiText).slice(0, 900), // 避免太長
        },
      ],
    }),
  });

  return res.status(200).json({ ok: true });
};
