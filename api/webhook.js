export default function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(200).send("OK");
  }

  console.log("LINE webhook HIT");

  res.status(200).json({ status: "ok" });
}
