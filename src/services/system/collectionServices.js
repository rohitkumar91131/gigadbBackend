const collectionDb = require("../../db/CollectionDb");

exports.addCollection = async ( name ,userId)=>{
    try{
        const newCollection = await collectionDb.createCollection( name , userId );
        return newCollection;   
    }
    catch(err){ 
        throw new Error("Error adding collection: " + err.message); 
    }    
}

exports.getCollections = async ( userId)=>{
    try{
        const collections = await collectionDb.findAllCollectionsByUserId( userId );
        return collections; 
    }
    catch(err){ 
        throw new Error("Error getting collections: " + err.message);   
    }       
}

