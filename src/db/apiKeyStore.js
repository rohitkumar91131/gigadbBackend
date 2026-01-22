const fs = require("fs")
const fsPromises = require("fs/promises")
const path = require("path")
const readline = require("readline")
const bcrypt = require("bcrypt")
const { appendRecord } = require("./fileUtils")
const { users_userId_index_Tree } = require("./indexStore")

const dbDir = path.join(process.cwd(), "databasefiles", "data")

function getUserDir(userId) {
  return path.join(dbDir, userId)
}

function getApiKeyFile(userId) {
  return path.join(getUserDir(userId), "apikey.jsonl")
}

async function ensureUserApiKeyFile(userId) {
  const dir = getUserDir(userId)
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true })
  }
  await fsPromises.writeFile(getApiKeyFile(userId), "", { flag: "a" })
}

async function appendApiKey(apiKeyDoc) {
  if (!apiKeyDoc.owner) {
    throw new Error("owner required")
  }

  await ensureUserApiKeyFile(apiKeyDoc.owner)
  return appendRecord(getApiKeyFile(apiKeyDoc.owner), apiKeyDoc)
}

async function revokeApiKey(apiKeyId, owner) {
  if (!apiKeyId || !owner) {
    throw new Error("apiKeyId and owner required")
  }

  await ensureUserApiKeyFile(owner)

  return appendRecord(
    getApiKeyFile(owner),
    {
      id: apiKeyId,
      status: "revoked",
      ts: Date.now()
    }
  )
}

async function findApiKeysByUserId(userId, page = 1, limit = 10) {
  await ensureUserApiKeyFile(userId)

  const filePath = getApiKeyFile(userId)
  const stream = fs.createReadStream(filePath, { encoding: "utf8" })
  const rl = readline.createInterface({ input: stream })

  const active = new Map()
  const revoked = new Set()

  for await (const line of rl) {
    if (!line.trim()) continue
    const data = JSON.parse(line)

    if (data.status === "revoked") {
      revoked.add(data.id)
      continue
    }

    if (data.keyHash) {
      active.set(data.id, data)
    }
  }

  const result = []
  for (const [id, record] of active.entries()) {
    if (!revoked.has(id)) result.push(record)
  }

  const start = (page - 1) * limit
  return result.slice(start, start + limit)
}

async function verifyApiKeyByHashKey(rawKey) {
  let leaf = users_userId_index_Tree.getFirstLeaf()

  while (leaf) {
    for (const entry of leaf.keys) {
      const userId = entry.key
      const filePath = getApiKeyFile(userId)

      if (!fs.existsSync(filePath)) continue

      const stream = fs.createReadStream(filePath, { encoding: "utf8" })
      const rl = readline.createInterface({ input: stream })

      const active = new Map()
      const revoked = new Set()

      for await (const line of rl) {
        if (!line.trim()) continue
        const data = JSON.parse(line)

        if (data.status === "revoked") {
          revoked.add(data.id)
          continue
        }

        if (data.keyHash) {
          active.set(data.id, data)
        }
      }

      for (const [id, record] of active.entries()) {
        if (revoked.has(id)) continue

        const match = await bcrypt.compare(rawKey, record.keyHash)
        if (match) {
          return userId
        }
      }
    }

    leaf = leaf.next
  }

  return null
}

module.exports = {
  appendApiKey,
  revokeApiKey,
  findApiKeysByUserId,
  verifyApiKeyByHashKey
}
