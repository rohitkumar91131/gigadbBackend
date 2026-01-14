const collectionService = require("../../services/system/collectionServices");

exports.createCollectionHandler  = async ( req ,res ) =>{
    const { name} = req.body;
    if(!name){
        return res.status(400).json({ 
            msg: "Collection name is required." ,
            success : false
        });
    }
    try{
        const userId = req.userId;
       // console.log(userId)

        const newCollection = await collectionService.addCollection( name , userId );

        return  res.status(201).json({ 
            msg: "Collection created successfully." ,
            success : true,
            collection : newCollection
        }); 
    }
    catch(err){

        return res.json({ 
            msg:  err.message ,
            success : false
        }); 

    }
}

exports.listCollectionsHandler = async ( req , res ) =>{
    try{
        const userId = req.userId;
        const collections = await collectionService.getCollections( userId );

        return res.status(200).json({ 
            msg: "Collections fetched successfully." ,
            success : true,
            collections : collections
        }); 
    }
    catch(err){
        return res.json({ 
            msg:  err.message ,
            success : false
        });     

    }
}       

