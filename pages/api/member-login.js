export default function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ success: false, error: 'Method not allowed' })
  }

  const { password } = req.body

  if (!process.env.MEMBER_PASSWORD) {
    return res.status(500).json({ success: false, error: 'Member password is not configured' })
  }

  if (password === process.env.MEMBER_PASSWORD) {
    return res.status(200).json({ success: true })
  }

  return res.status(401).json({ success: false, error: 'Wrong password' })
}
