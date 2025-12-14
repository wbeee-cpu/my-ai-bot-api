// === BOOT LOG：用來確認你打到的是不是最新程式 ===
console.log("BOOT VERSION 2025-01");

const crypto = require("crypto");
const fetch = require("node-fetch");

module.exports = async (req, res) => {
  // 1) 只接受 POST
  if (req.method !== "POST") {
    return res.status(200).send("OK");
  }

  // 2) 檢查環境變數是否存在（只印 true/false）
  console.log("HAS_SECRET:", !!process.env.LINE_CHANNEL_SECRET);
  console.log("HAS_TOKEN:", !!process.env.LINE_CHANNEL_ACCESS_TOKEN);

  const channelSecret = process.env.LINE_CHANNEL_SECRET;
  const accessToken = process.env.LINE_CHANNEL_ACCESS_TOKEN;

  if (!channelSecret || !accessToken) {
    return res.status(500).send("Missing env");
  }

  // 3) 驗證 LINE 簽章
  const signature = req.headers["x-line-signature"];
  const bodyText = JSON.stringify(req.body);

  const hash = crypto
    .createHmac("sha256", channelSecret)
    .update(bodyText)
    .digest("base64");

  if (hash !== signature) {
    return res.status(401).send("Invalid signature");
  }

  // 4) 印出收到的事件（IN）
  console.log("IN:", JSON.stringify(req.body));

  const event = req.body?.events?.[0];
  const replyToken = event?.replyToken;

  if (!replyToken) {
    return res.status(200).json({ ok: true, note: "no replyToken" });
  }

  const userText =
    event?.message?.type === "text"
      ? event.message.text
      : "(non-text event)";

  // 5) 呼叫 LINE Reply API
  const r = await fetch("https://api.line.me/v2/bot/message/reply", {
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
          text: `收到：${userText}`,
        },
      ],
    }),
  });

  const t = await r.text();
  console.log("REPLY_STATUS:", r.status);
  console.log("REPLY_BODY:", t);

  return res.status(200).json({ ok: true });
};
