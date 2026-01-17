const path = require("path");
const { compacticationFilesIndexes , collections ,collections_name_index_Tree} = require("./indexStore");
const fs = require("fs");
const readline = require("readline");


async function readCollectionsFile(){
    try{ 
        const collectionFilePath = path.join(
          process.cwd(),
          "databasefiles",
          "system",
          "collections.jsonl"
        );



        

    }
    catch(err){
        throw new Error("Error in reading collections.jsonl"+err.message)
    }
}





