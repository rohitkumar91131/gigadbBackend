const fs = require("fs");
const fsPromises = require("fs/promises");
const { writeFile } = fsPromises;
const {appendRecord , readRecord} = require("./fileUtils")
const readline = require("readline");
const { userDataIndexes ,} = require("./indexStore");
const { normalizeCollectionName} = require("../utils/normalizeCollectionName");
const BPlusTree = require("./BPlusTree");
const generateFakeDoc  = require("../utils/seedFakeData")

async function buildUserDataFile(filePath , userId , collectionName){
    try{

        await writeFile(filePath , "" , { flag: "a" });
        const label = `Building index for ${filePath}`;
        const normalizedCollectionName = normalizeCollectionName(collectionName);

        const indexKey = `${userId}:${normalizedCollectionName}`;
        const indexTree = new BPlusTree(10);
        userDataIndexes.set(indexKey , indexTree);

        const stream = fs.createReadStream(filePath , { encoding : "utf8"});
        const rl = readline.createInterface({
            input : stream,
            crlfDelay : Infinity
        })

        let offset = 0;

        for await(const line of rl ){
            if(!line.trim()) continue;
            const data = JSON.parse(line);
            if(data.id && data._deleted !== true){
                indexTree.insert(data.id , offset);
            }
            if(data.id && data._deleted === true){
                indexTree.delete(data.id)
            }

            offset += Buffer.byteLength(line, "utf8") + 1; 

        }

        console.timeEnd(label);

    }
    catch(err){
        console.log(err)
        throw new Error("Error in indexing ", err.message)
    }

}

async function readDataFileByPage( filePath , userId , collectionName , pageNumber , pageLimit){
    try{
        const normalizedCollectionName = normalizeCollectionName(collectionName);
        const key = `${userId}:${normalizedCollectionName}`;

        let indexTree  = userDataIndexes.get(key);
        if(indexTree ===undefined || !indexTree){
            await buildUserDataFile(filePath , userId , collectionName);
            indexTree = userDataIndexes.get(key);
        }

        const allOffsets = indexTree.findValuesByPage(pageNumber , pageLimit);
        const result = [];
        if(allOffsets.length === 0 ){
            return [];
        }
       // console.log(filePath)
        const fd = await fsPromises.open(filePath , "r");

        for( let position of allOffsets){
            let buffer = Buffer.alloc(0);
            const chunk = Buffer.alloc(256);
            let currPosition = position.value
            while(true){
                const { bytesRead} = await fd.read(chunk , 0 , chunk.length , currPosition);
                if(!bytesRead){
                    break;
                }

                buffer = Buffer.concat([ buffer , chunk.slice( 0 , bytesRead) ]);
                currPosition += bytesRead;

                const newLineIndex = buffer.indexOf("\n");
                if(newLineIndex !== -1 ){
                    buffer = buffer.slice(0 , newLineIndex);
                    break;
                }
            }

            const data = JSON.parse(buffer.toString("utf-8"));
           // console.log(data , "\n")
            if(data._deleted === true) continue;
            result.push(data)
        }

        await fd.close();

        return result

    }
    catch(err){
        console.log(err)
        throw new Error("Error in reading ", err.message)
    }
}

async function insertDataIntoUserCollection ( filePath , userId , collectionName , data){
    try{
        const offset = await appendRecord(filePath , data);


        if (offset === undefined || offset === null){
            throw new Error("Error in inserting data")
            return
        } 

        const normalizedCollectionName = normalizeCollectionName(collectionName);
        const key = `${userId}:${normalizedCollectionName}`;
        let indexTree  = userDataIndexes.get(key);

        if(indexTree === undefined){
            await buildUserDataFile(filePath ,userId , collectionName )
        }
        else{
            indexTree.insert(data.id , offset)

        }


        return true
    }
    catch(err){
        throw new Error("error in inserting ", err.message)
    }
}

async function DeleteDataFromCollection(filePath , collectionId , collectionName , userId ){
    try{
        const normalizedCollectionName = normalizeCollectionName(collectionName);
        const key = `${userId}:${normalizedCollectionName}`;
        let indexTree  = userDataIndexes.get(key);

       if(indexTree ===undefined || !indexTree){
           await buildUserDataFile(filePath , userId , collectionName);
           indexTree = userDataIndexes.get(key);
        }

        const offset = indexTree.find(collectionId );
        console.log("Deleting offset ", offset);


        
        const deletedData = {
            id : collectionId ,
            _deleted : true,
            ts: Date.now()
        }

        const deletedOffset = await appendRecord(filePath , deletedData);

        indexTree.delete(collectionId ) ;

        return true;

    }
    catch(err){
        console.log(err)
        throw new Error("Error in deleting data from collection ", err.message)
    }
}

async function seedFakeData(filePath, userId, collectionName, count) {
  try {

    await writeFile(filePath, "", { flag: "a" });
    const normalizedCollectionName = normalizeCollectionName(collectionName);
    const key = `${userId}:${normalizedCollectionName}`;

    let indexTree  = userDataIndexes.get(key);

    if(indexTree ===undefined || !indexTree){
        await buildUserDataFile(filePath , userId , collectionName);
        indexTree = userDataIndexes.get(key);
    }

    const stats = await fsPromises.stat(filePath);
    let currentOffset = stats.size;

    await new Promise((resolve, reject) => {
      const stream = fs.createWriteStream(filePath, { flags: "a" });

      stream.on("error", reject);
      let offset = 0;

      for (let i = 0; i < count; i++) {
        const doc = generateFakeDoc(collectionName);
        const jsonLine = JSON.stringify(doc) + "\n";
        const lineLength = Buffer.byteLength(jsonLine);
        stream.write(JSON.stringify(doc) + "\n");
        indexTree.insert(doc.id , currentOffset);
        currentOffset += lineLength;
      }

      stream.end(resolve);
    });


    return true;

  } catch (error) {
    console.error(`Error seeding fake data for collection ${collectionName}:`, error);
    throw error; 
  }
}
module.exports = {
    readDataFileByPage,
    buildUserDataFile,
    insertDataIntoUserCollection,
    seedFakeData,
    DeleteDataFromCollection
}
