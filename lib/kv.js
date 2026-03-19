import { kv } from '@vercel/kv'

const TTL_SECONDS = 60 * 60 * 24 * 7 // 7 days max

export async function saveSecret(id, payload) {
  await kv.set(`secret:${id}`, JSON.stringify(payload), { ex: TTL_SECONDS })
}

export async function getSecret(id) {
  const raw = await kv.get(`secret:${id}`)
  if (!raw) return null
  return typeof raw === 'string' ? JSON.parse(raw) : raw
}

export async function deleteSecret(id) {
  await kv.del(`secret:${id}`)
}
