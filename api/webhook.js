export default function handler(req, res) {
  console.log("HIT /api/webhook", req.method);
  res.status(200).json({ ok: true, method: req.method });
}
