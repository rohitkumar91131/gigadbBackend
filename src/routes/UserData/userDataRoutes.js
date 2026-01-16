const express = require("express");
const router = express.Router();
const userDataController = require("../../controllers/UserData/userDataController");
const {isAuthenticated} = require("../../middlewares/authMiddleware")

router.get("/",isAuthenticated , userDataController.getDataByPage);

router.post("/insert" ,isAuthenticated , userDataController.insertData)

router.post(
  "/seed",
  isAuthenticated,
  userDataController.seedCollection
);


module.exports = router;