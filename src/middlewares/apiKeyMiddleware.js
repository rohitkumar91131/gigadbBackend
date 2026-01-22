const { verifyApiKeyByHashKey } = require("../db/apiKeyStore")

async function requireApiKey(req, res, next) {
  try {
    const apiKey = req.headers["x-api-key"] || req.headers["authorization"]

    if (!apiKey) {
      return res.status(401).json({
        success: false,
        msg: "API key required"
      })
    }

    const hashKey = apiKey.replace("Api-Key ", "").trim()
    console.log("HASH USED:", hashKey)


    const userId = await verifyApiKeyByHashKey(hashKey)
    if (!userId) {
      return res.status(401).json({
        success: false,
        msg: "Invalid API key"
      })
    }

    req.userId = userId
    next()
  } catch (err) {
    res.status(500).json({
      success: false,
      msg: err.message
    })
  }
}

module.exports = { requireApiKey }
