export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).send('Method Not Allowed');
  }

  console.log('LINE webhook received');
  console.log(JSON.stringify(req.body, null, 2));

 
  res.status(200).json({ ok: true });
}
