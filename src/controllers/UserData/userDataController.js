const { ulid } = require("ulid");
const userDataServices = require("../../services/UserData/userDataServices");
const {normalizeCollectionName}  = require("../../utils/normalizeCollectionName");

exports.getDataByPage = async (req, res) => {
  try {
    const userId = req.userId;
    const { collectionName, pageNumber, pageLimit } = req.query;

    if (!collectionName || !pageNumber || !pageLimit) {
      return res.status(400).json({
        success: false,
        msg: "collectionName, pageNumber, pageLimit required in query"
      });
    }

    const page = Number(pageNumber);
    const limit = Number(pageLimit);

    if (!Number.isInteger(page) || !Number.isInteger(limit) || page < 1 || limit < 1) {
      return res.status(400).json({
        success: false,
        msg: "pageNumber and pageLimit must be positive integers"
      });
    }

    const data = await userDataServices.findDataByPage(
      userId,
      normalizeCollectionName(collectionName),
      page,
      limit
    );

    res.json({
      success: true,
      msg: "Data retrieved successfully",
      data
    });

  } catch (err) {
    console.log(err)
    res.status(500).json({
      success: false,
      msg: err.message
    });
  }
};

exports.insertData = async (req,res ) =>{
    try{
        const { collectionName} = req.query;
        const data = req.body.data;
        const userId = req.userId;


        const savedData = await userDataServices.insertDataService(
            normalizeCollectionName(collectionName),
            userId,
            data
        )

        res.json({
            success : true,
            msg : "Appended succesful",
            data : savedData
        })

    }
    catch(err){
        res.json({
            success : false,
            msg : err.message
        })
    }
}

exports.seedCollection = async (req, res) => {
  try {
    const { collectionName, count } = req.query;
    const userId = req.userId;

    if (!collectionName || !count) {
      throw new Error("collectionName and count required");
    }

    await userDataServices.seedCollectionService(
      userId,
      collectionName,
      Number(count)
    );

    res.json({
      success: true,
      msg: "Seeding completed"
    });
  } catch (err) {
    res.json({
      success: false,
      msg: err.message
    });
  }
};
