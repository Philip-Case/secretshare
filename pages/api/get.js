import { getSecret, deleteSecret } from '../../lib/kv'

export default async function handler(req, res) {
  if (req.method !== 'GET') return res.status(405).end()

  const { id } = req.query
  if (!id) return res.status(400).json({ error: 'Missing id' })

  const record = await getSecret(id)
  if (!record) return res.status(404).json({ error: 'not_found' })

  if (record.burn) {
    await deleteSecret(id)
  }

  return res.status(200).json(record)
}
