const express = require("express")
const router = express.Router()
const userDataController = require("../controllers/UserData/userDataController")
const { requireApiKey } = require("../middlewares/apiKeyMiddleware")

router.get("/", requireApiKey, userDataController.getDataByPage)
router.post("/", requireApiKey, userDataController.insertData)
router.put("/", requireApiKey, userDataController.updateDataController)
router.delete("/", requireApiKey, userDataController.deteteDataFromCollection)
router.post("/seed", requireApiKey, userDataController.seedCollection)

module.exports = router
