const express = require("express");
const router = express.Router();
const collectionControllers = require("../../controllers/system/collectionController");
const { isAuthenticated}  = require("../../middlewares/authMiddleware");


router.post("/create",isAuthenticated ,  collectionControllers.createCollectionHandler);
router.get("/",isAuthenticated , collectionControllers.listCollectionsHandler);
module.exports = router
