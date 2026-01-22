const crypto = require("crypto")
const bcrypt = require("bcrypt")
const { ulid } = require("ulid")
const {
  appendApiKey,
  findApiKeysByUserId,
  revokeApiKey
} = require("../db/apiKeyStore")

const BCRYPT_ROUNDS = 12

function generateApiKey() {
  return "giga_" + crypto.randomBytes(24).toString("hex")
}

async function createApiKey({ name, owner }) {
  if (!name || !owner) {
    throw new Error("name and owner required")
  }

  const apiKey = generateApiKey()
  const hash = await bcrypt.hash(apiKey, BCRYPT_ROUNDS)

  const doc = {
    id: ulid(),
    name,
    owner,
    keyHash: hash,
    status: "active",
    createdAt: Date.now()
  }

  await appendApiKey(doc)

  return {
    apiKey,
    id: doc.id,
    name: doc.name
  }
}

async function getApiKeysByUser(userId, page, limit) {
  return findApiKeysByUserId(userId, page, limit)
}

async function revokeApiKeyService(apiKeyId, owner) {
  return revokeApiKey(apiKeyId, owner)
}

module.exports = {
  createApiKey,
  getApiKeysByUser,
  revokeApiKey: revokeApiKeyService
}
