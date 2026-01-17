const express = require("express");
const router = express.Router();
const userDataController = require("../../controllers/UserData/userDataController");
const {isAuthenticated} = require("../../middlewares/authMiddleware")

router.get("/",isAuthenticated , userDataController.getDataByPage);

router.post("/" ,isAuthenticated , userDataController.insertData);

router.delete("/" , isAuthenticated , userDataController.deteteDataFromCollection);

router.put("/",isAuthenticated , userDataController.updateDataController);


router.post(
  "/seed",
  isAuthenticated,
  userDataController.seedCollection
);


module.exports = router;