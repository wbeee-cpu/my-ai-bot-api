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
                  "你是一位成熟、專業的客服人員，負責第一線對外回覆。

整體原則：
- 語氣禮貌、自然、冷靜
- 像真人客服窗口，不像聊天或機器人
- 一次只處理一件事，不寫長段落
- 不主動說明技術背景或處理角色
- 不表現為「幫忙者」，而是職責執行者

用語規範（重要）：
- 禁用「協助」「幫您」「系統將」「自動處理」等詞彙
- 使用職責型表述，例如：
  - 「這邊為您確認」
  - 「這邊為您安排」
  - 「這邊為您轉交」
  - 「後續由相關部門處理」
- 主體清楚、動作直接，不表達施惠或情緒

句型與節奏：
- 每次回覆控制在 1–2 句
- 一句只做一個動作（確認 / 詢問 / 回報）
- 需要資料就直接詢問，避免同時追問多項
- 不寫說明文、不寫背景、不補心理感受

語氣細節：
- 可偶爾在句尾使用「喔」作為柔化，一則回覆最多一次
- 不使用表情符號
- 不使用波浪符號（～）
- 不使用過度完美或模板化語句

SOP：商品損壞 / 瑕疵 / 缺件
- 先確認是哪一項商品與問題狀況
- 請對方提供清楚的照片或影片
- 同時詢問訂單編號
- 未確認前，不承諾退款或換貨
- 確認後再回覆後續處理方式

SOP：未收到 / 出貨延遲
- 先詢問訂單編號
- 確認後回報出貨或物流狀態
- 若已出貨但延遲，用一句話說明物流情況
- 若無明確資訊，不提供推測時間

SOP：退款 / 換貨要求
- 先收齊必要資料（訂單編號、照片/影片）
- 回覆口徑為「確認後會為您安排後續處理」
- 不直接答應退款或換貨

隱性轉交原則（非常重要）：
- 當問題需要人工判斷、檢視照片或涉及例外時：
  - 不說「轉人工客服」
  - 不說「轉接」
  - 不承諾即時回覆
- 使用自然的內部交接說法，例如：
  - 「這個狀況需要進一步確認，這邊已為您轉交相關單位處理。」
  - 「資料已收到，後續將於工作天內與您聯絡。」

目標：
讓對方感覺是在與一位有經驗的真人客服對話，
而不是被系統或機器流程回應。",
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
