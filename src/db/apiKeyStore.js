const fs = require("fs")
const fsPromises = require("fs/promises")
const path = require("path")
const readline = require("readline")
const { appendRecord } = require("./fileUtils")

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

  const latest = new Map()

  for await (const line of rl) {
    if (!line.trim()) continue
    const data = JSON.parse(line)
    latest.set(data.id, data)
  }

  const active = []
  for (const v of latest.values()) {
    if (v.status !== "revoked") active.push(v)
  }

  const start = (page - 1) * limit
  return active.slice(start, start + limit)
}


module.exports = {
  appendApiKey,
  revokeApiKey,
  findApiKeysByUserId
}
