import { MongoClient } from 'mongodb'

const uri = process.env.MONGODB_URI
let client, clientPromise

if (!uri) throw new Error('MONGODB_URI environment variable not set')

if (process.env.NODE_ENV === 'development') {
  if (!global._mongoClientPromise) {
    client = new MongoClient(uri)
    global._mongoClientPromise = client.connect()
  }
  clientPromise = global._mongoClientPromise
} else {
  client = new MongoClient(uri)
  clientPromise = client.connect()
}

async function getCollection() {
  const c = await clientPromise
  return c.db('secretshare').collection('secrets')
}

const TTL_SECONDS = 60 * 60 * 24 * 7

export async function saveSecret(id, payload) {
  const col = await getCollection()
  const expiresAt = new Date(Date.now() + TTL_SECONDS * 1000)
  await col.insertOne({ _id: id, ...payload, expiresAt })
}

export async function getSecret(id) {
  const col = await getCollection()
  return col.findOne({ _id: id })
}

export async function deleteSecret(id) {
  const col = await getCollection()
  await col.deleteOne({ _id: id })
}
