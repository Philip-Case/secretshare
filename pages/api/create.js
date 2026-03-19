import { v4 as uuidv4 } from 'uuid'
import { saveSecret } from '../../lib/kv'

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).end()

  const { salt, iv, ct, burn } = req.body
  if (!salt || !iv || !ct) return res.status(400).json({ error: 'Missing fields' })

  const id = uuidv4().replace(/-/g, '').slice(0, 16)
  await saveSecret(id, { salt, iv, ct, burn: !!burn, created: Date.now() })

  return res.status(200).json({ id })
}
