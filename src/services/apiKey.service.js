const crypto = require("crypto");
const { ulid } = require("ulid");
const {
  appendApiKey,
  findApiKeysByUserId,
  revokeApiKey
} = require("../db/apiKeyStore");

function generateApiKey() {
  return "giga_" + crypto.randomBytes(32).toString("hex");
}

async function createApiKey({ name, owner }) {
  const apiKey = generateApiKey();
  const hash = crypto.createHash("sha256").update(apiKey).digest("hex");

  const doc = {
    id: ulid(),
    name,
    owner,
    keyHash: hash,
    status: "active",
    createdAt: Date.now()
  };

  await appendApiKey(doc);

  return {
    apiKey,
    id: doc.id,
    name: doc.name
  };
}

async function getApiKeysByUser(userId, page, limit) {
  return findApiKeysByUserId(userId, page, limit);
}

async function revokeApiKeyService(apiKeyId, owner) {
  return revokeApiKey(apiKeyId, owner);
}

module.exports = {
  createApiKey,
  getApiKeysByUser,
  revokeApiKey: revokeApiKeyService
};
