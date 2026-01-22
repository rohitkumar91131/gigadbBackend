const express = require("express");
const router = express.Router();
const apiKeyController = require("../controllers/apiKey.controller");
const { isAuthenticated } = require("../middlewares/authMiddleware");

router.post("/",isAuthenticated ,  apiKeyController.createApiKey);
router.get("/",isAuthenticated, apiKeyController.getApiKeysByUser);
router.post("/revoke", isAuthenticated , apiKeyController.revokeApiKey);

module.exports = router;
