const { ulid } = require("ulid");
const {readDataFileByPage}  = require("../../db/UserDataDb");
const {normalizeCollectionName } = require("../../utils/normalizeCollectionName");
const { insertDataIntoUserCollection , DeleteDataFromCollection} = require("../../db/UserDataDb");
const path = require("path")
const {seedFakeData}  = require("../../db/UserDataDb")

exports.findDataByPage =async (userId , collectionName , pageNumber , pageLimit ) =>{
    try{
        const normalizedCollectionName = normalizeCollectionName(collectionName)
        const filePath = path.join(process.cwd() ,  "databasefiles" ,"data ", userId , normalizedCollectionName + ".jsonl");
        const data = await readDataFileByPage( filePath , userId , collectionName , pageNumber , pageLimit );
        return data;
    }
    catch(err){
        console.log(err)
        throw new Error("Error in userData service" , err.message)
    }
}

exports.insertDataService = async (collectionName , userId , data) =>{
    try{
        const newData = {
            id : ulid(),
            ...data
        }
        const filePath = path.join(process.cwd() ,  "databasefiles" ,"data ", userId , normalizeCollectionName(collectionName) + ".jsonl");

        await insertDataIntoUserCollection(filePath , userId , collectionName , newData);
        return newData
    }
    catch(err){
        throw new Error("Error in inserting service ", err.message)
    }
}

exports.deleteDataService = async (userId, collectionId, collectionName) => {
    const filePath = path.join(
        process.cwd(),
        "databasefiles",
        "data ",
        userId,
        normalizeCollectionName(collectionName) + ".jsonl"
    );

    const deleted = await DeleteDataFromCollection(
        filePath,
        collectionId,
        collectionName,
        userId
    );

    return deleted;
};


exports.seedCollectionService = async (userId, collectionName, count) => {
  const filePath = path.join(
    process.cwd(),
    "databasefiles",
    "data ",
    userId,
    normalizeCollectionName(collectionName) + ".jsonl"
  );

  await seedFakeData(filePath, userId, collectionName, count);

  return true;
};
