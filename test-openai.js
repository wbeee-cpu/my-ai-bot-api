const OpenAI = require("openai");
require("dotenv").config();

const client = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

async function main() {
  try {
    const result = await client.chat.completions.create({
      model: "gpt-4o-mini",
      messages: [
        { role: "user", content: "Say hi from my local Node.js test script." },
      ],
    });

    console.log("=== OPENAI 回覆 ===");
    console.log(result.choices[0].message);
  } catch (err) {
    console.error("=== 發生錯誤 ===");
    console.error("status:", err.status);
    console.error("message:", err.message);
    if (err.response && err.response.data) {
      console.error("details:", err.response.data);
    }
  }
}

main();
