const apiKeyService = require("../services/apiKey.service");

async function createApiKey(req, res) {
  try {
    const userId = req.userId;
    const { name, keyHash } = req.body; 
    const result = await apiKeyService.createApiKey({
      name,
      owner: userId,
      keyHash
    });

    res.status(201).json({
      success: true,
      msg: "API Key created successfully.",
      data: result,
    });
  } catch (error) {
    console.error("Create Key Error:", error);
    res.status(500).json({
      success: false,
      msg: error.message || "Internal Server Error",
    });
  }
}

async function getApiKeysByUser(req, res) {
  try {
    const userId = req.userId;
    const page = Number(req.query.page || 1);
    const limit = Number(req.query.limit || 10);

    const data = await apiKeyService.getApiKeysByUser(userId, page, limit);

    res.status(200).json({
      success: true,
      msg: "API keys fetched successfully.",
      data: data, // Array of keys
    });
  } catch (error) {
    console.error("Get Keys Error:", error);
    res.status(500).json({
      success: false,
      msg: "Failed to retrieve API keys.",
    });
  }
}

async function revokeApiKey(req, res) {
  try {
    const userId = req.userId;
    const { apiKeyId } = req.body;

    await apiKeyService.revokeApiKey(apiKeyId, userId);

    res.status(200).json({
      success: true,
      msg: "API key revoked successfully.",
    });
  } catch (error) {
    console.error("Revoke Key Error:", error);
    res.status(500).json({
      success: false,
      msg: error.message || "Failed to revoke API key.",
    });
  }
}

module.exports = {
  createApiKey,
  getApiKeysByUser,
  revokeApiKey
};