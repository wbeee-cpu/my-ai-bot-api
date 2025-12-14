const crypto = require("crypto");
const fetch = require("node-fetch");

module.exports = async (req, res) => {
  // 1) 只接受 POST
  if (req.method !== "POST") {
    return res.status(200).send("OK");
  }

  // 2) 讀取必要環境變數
  const channelSecret = process.env.LINE_CHANNEL_SECRET;
  const accessToken = process.env.LINE_CHANNEL_ACCESS_TOKEN;

  if (!channelSecret) {
    console.log("ERROR: Missing LINE_CHANNEL_SECRET");
    return res.status(500).send("Missing LINE_CHANNEL_SECRET");
  }

  if (!accessToken) {
    console.log("ERROR: Missing LINE_CHANNEL_ACCESS_TOKEN");
    return res.status(500).send("Missing LINE_CHANNEL_ACCESS_TOKEN");
  }

  // 3) 驗證 LINE 簽章
  const signature = req.headers["x-line-signature"];
  const bodyText = JSON.stringify(req.body);

  const hash = crypto
    .createHmac("sha256", channelSecret)
    .update(bodyText)
    .digest("base64");

  if (hash !== signature) {
    console.log("ERROR: Invalid signature");
    return res.status(401).send("Invalid signature");
  }

  // 4) 印出收到的事件（你已經看到過這個 IN）
  console.log("IN:", JSON.stringify(req.body));

  const event = req.body?.events?.[0];
  const replyToken = event?.replyToken;

  // 有些事件沒有 replyToken（例如 follow）
  if (!replyToken) {
    console.log("No replyToken");
    return res.status(200).json({ ok: true });
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
