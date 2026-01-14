const path = require("path");
const fs = require("fs");
const fsp = require("fs").promises;
const { readRecord, appendRecord } = require("./fileUtils");
const readline = require("readline");
const BPlusTree = require("./BPlusTree"); 
const { ulid } = require("ulid");
const {normalizeCollectionName} = require('../utils/normalizeCollectionName');
const dbDir = path.join(process.cwd(), "databasefiles" , "system");
const collectionDbFile = path.join(dbDir, "collections.jsonl");

const collections_userId_index_Tree = new BPlusTree(10);
const collections_name_index_Tree = new BPlusTree(10);

if (!fs.existsSync(dbDir)) fs.mkdirSync(dbDir, { recursive: true });
if (!fs.existsSync(collectionDbFile)) fs.writeFileSync(collectionDbFile, "");


async function buildCollectionIndex(){
    try{
        console.time("Building Collection Index");
        const stream = fs.createReadStream(collectionDbFile, { encoding: "utf8" });
        const rl = readline.createInterface({ input: stream, crlfDelay: Infinity });

        let offset = 0;
        for await (const line of rl) {
            if (!line.trim()) continue;
            const collection = JSON.parse(line);
            const key = `${collection.userId}:${collection.name.toLowerCase()}`;

            collections_userId_index_Tree.insertMulti(collection.userId, offset);
            collections_name_index_Tree.insert(key , offset);

            offset += Buffer.byteLength(line, "utf8") + 1; 
        }
        console.timeEnd("Building Collection Index");   
    }
    catch(err){
        console.error("Error building collection index:", err);
    }
}


async function findAllCollectionsByUserId(userId){
    try{
        const offsets = collections_userId_index_Tree.findAllValues(userId);
        if(offsets === null || offsets === undefined) {
            throw new Error("No collections found for this user.");
        }

        const collections = [];
        for( const offset of offsets ){
            const collection = await readRecord(collectionDbFile, offset);
            collections.push(collection);   
        }

        return collections;
    }
    catch(err){
        throw new Error("Error finding collections by userId: " + err.message);
    }
}

async function createCollection ( collectionName , userId){
    const normalizedCollectionName = normalizeCollectionName(collectionName)
    const key = `${userId}:${normalizedCollectionName.toLowerCase()}`;
    try{
       const isExits = await collections_name_index_Tree.find(key) !== null;
       if(isExits){
            throw new Error("Collection with this name already exists.");
       }

       const newCollection = {
            id: ulid(),
            name: normalizedCollectionName,
            userId: userId,
            createdAt: new Date().toISOString()
       };

       const offset = await appendRecord(collectionDbFile, newCollection);

        collections_userId_index_Tree.insertMulti(userId, offset);
        collections_name_index_Tree.insertMulti(key , offset);
       
    }
    catch(err){
        throw new Error("Error creating collection: " + err.message);
    }
}


module.exports = {
    buildCollectionIndex,
    findAllCollectionsByUserId,
    createCollection
}