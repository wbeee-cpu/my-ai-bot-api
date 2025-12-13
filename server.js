const express = require("express");
const crypto = require("crypto");
require("dotenv").config();

const app = express();

/**
 * LINE Webhook
 * 注意：必須用 raw body 才能驗簽
 */
app.post("/webhook", express.raw({ type: "*/*" }), (req, res) => {
  try {
    const signature = req.get("X-Line-Signature") || "";
    const body = req.body;

    const hash = crypto
      .createHmac("SHA256", process.env.LINE_CHANNEL_SECRET)
      .update(body)
      .digest("base64");

    if (hash !== signature) {
      console.log("❌ Bad signature");
      return res.status(401).send("Bad signature");
    }

    console.log("✅ LINE EVENT:");
    console.log(body.toString("utf8"));

    res.status(200).send("OK");
  } catch (err) {
    console.error("Webhook error:", err);
    res.status(200).send("OK");
  }
});

app.get("/", (req, res) => {
  res.send("LINE AI Bot server is running");
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`🚀 Server running on port ${PORT}`);
});
