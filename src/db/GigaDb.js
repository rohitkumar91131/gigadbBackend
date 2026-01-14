const dotenv = require("dotenv");
dotenv.config();
const BPlusTree = require("./BPlusTree");
const fs = require("fs");              
const fsp = require("fs/promises");    
const path = require("path");
const User = require("../models/Users");
const collection = require("../models/Collection");
const {ulid} = require("ulid");
const { faker } = require('@faker-js/faker');
const readline = require("readline");
const jwt = require("jsonwebtoken");
const bcrypt = require("bcryptjs")
const nodemailer = require("nodemailer");
const {getVerificationEmailTemplate} = require("../src/utils/emailTemplates");
const  sgMail = require("@sendgrid/mail");
const { randomFill } = require("crypto");
const { off } = require("process");
const { file } = require("googleapis/build/src/apis/file");
sgMail.setApiKey(process.env.SENDGRID_API_KEY)


const users_userId_index_Tree = new BPlusTree(10);
const users_email_index_Tree = new BPlusTree(10);
const collections_userId_index_Tree = new BPlusTree(10);
const collections_id_index_Tree = new BPlusTree(10);
const collections_userId_name_index_Tree = new BPlusTree(10);

const userDbFile = path.join(__dirname,".." ,"databasefiles", "users.jsonl");
const collectionFile = path.join(__dirname,".." ,"databasefiles", "collection.jsonl");

console.log(process.cwd() + "src/db/GigaDb.js")

const dbDir = path.join(process.cwd(), "databasefiles")
const dbFile = path.join(dbDir, "users.jsonl")
const collectionDbFile = path.join(dbDir, "collection.jsonl");
const indexFile = path.join(dbDir, "index.jsonl");

if (!fs.existsSync(dbDir)) {
    fs.mkdirSync(dbDir, { recursive: true })
}

if (!fs.existsSync(dbFile)) {
    fs.writeFileSync(dbFile, "")
}

if(!fs.existsSync(collectionDbFile)){
    fs.writeFileSync(collectionDbFile , "")
}   

if(!fs.existsSync(indexFile)){
    fs.writeFileSync(indexFile , "")
}   

async function sendEmail(to, subject, htmlTemplate) {
  try {
    console.log("Attempting to send email to:", to)

    const info = await sgMail.send({
      to,
      from: process.env.EMAIL_FROM,
      subject,
      html: htmlTemplate
    })

    console.log("Email sent:", info[0].statusCode)
    return { success: true }

  } catch (error) {
    console.error("Email Failed:", error.response?.body || error)
    return { success: false, error: error.message }
  }
}

async function verifyUserEmail(token) {
    if (!token) return { success: false, msg: "Invalid or Expired Token" }

    let fd = null
    try {
        const decoded = jwt.verify(token, "temporary_secret")
        const email = decoded.email.toLowerCase()
        const userId = decoded.userId

        const oldOffset = users_email_index_Tree.find(email)
        if (oldOffset === null || oldOffset === undefined) {
            return { success: false, msg: "User not found" }
        }

        fd = await fsp.open(userDbFile, "r+")

        const buffer = Buffer.alloc(1024)
        const { bytesRead } = await fd.read(buffer, 0, buffer.length, oldOffset)

        const str = buffer.slice(0, bytesRead).toString("utf8")
        const line = str.slice(0, str.indexOf("\n"))
        const userData = JSON.parse(line)

        if (userData.email !== email || userData.id !== userId) {
            await fd.close()
            return { success: false, msg: "Invalid token" }
        }

        if (userData.emailVerified) {
            await fd.close()
            return { success: true, msg: "Email already verified" }
        }

        userData.emailVerified = true
        const newLine = JSON.stringify(userData) + "\n"

        const stats = await fd.stat()
        const newOffset = stats.size

        await fd.write(newLine, newOffset, "utf8")
        await fd.close()

        users_email_index_Tree.delete(email)
        users_userId_index_Tree.delete(userId)

        users_email_index_Tree.insert(email, newOffset)
        users_userId_index_Tree.insert(userId, newOffset)

        return { success: true, msg: "Email verified successfully" }

    } catch (err) {
        if (fd) await fd.close()
        return { success: false, msg: "Invalid or Expired Token" }
    }
}


async function signUpUser({ email, password }) {
    if (!email || !password) {
        return {
            msg: "email and password both are required",
            success: false
        };
    }

    try {

        const exists = users_email_index_Tree.find(email.toLowerCase());
        if(exists !==null ){
            return {
                msg : "User already exists",
                success : false
            }
        }
        const hashedPassword = await bcrypt.hash(password, 10);
        const newUser = new User({
             email : email.toLowerCase(), 
             password : hashedPassword,
             id : ulid()
        });
        const line = JSON.stringify(newUser) + "\n";

        const { size } = await fsp.stat(userDbFile);
        const offset = size;

        await fsp.appendFile(userDbFile, line, "utf8");

        users_userId_index_Tree.insert(newUser.id , offset);
        users_email_index_Tree.insert(newUser.email.toLowerCase() , offset);

        const verificationToken = jwt.sign(
            { userId: newUser.id, email: newUser.email },
            "temporary_secret", 
            { expiresIn: "1h" } 
        );

        const frontendUrl = process.env.FRONTEND_URL;
        const verificationLink = `${frontendUrl}/verify-email?token=${verificationToken}`
        const emailHtml = getVerificationEmailTemplate(newUser.name || newUser.email.split('@')[0], verificationLink);

        await sendEmail(
            newUser.email,
            "Verify your GigaDB account", 
            emailHtml 
        );

        return {
            msg : "User saved",
            success : true
        }
    } catch (err) {
        return {
            success : false,
            msg : err.message
        }
    }
}

async function Login({ email , password} , res){
    if(!email || !password) {
        return res.json({
            success : false,
            msg : " Email and password both are required"
        })
    }
    try{
        const offset = users_email_index_Tree.find(email.toLowerCase()) ;
        if(offset === null || offset === undefined){
            return res.json({
                success : false,
                msg : "User doesnt exists"
            })
        }

        const fd = await fsp.open(userDbFile , "r");

        let buffer = Buffer.alloc(0);
        let chunk = Buffer.alloc(256);
        let position = offset;

        while(true){
            const { bytesRead }  = await fd.read(chunk , 0 , chunk.length , position);
            if(bytesRead === 0) break;

            buffer = Buffer.concat([ buffer , chunk.slice(0 , bytesRead)]);

            const newLineIndex = buffer.indexOf("\n");
            if(newLineIndex !== -1){
                buffer = buffer.slice(0 , newLineIndex);
                break;
            }

            position += bytesRead
        }

        await fd.close()


        const user =  JSON.parse(buffer.toString("utf-8"));
        const isMatch = await bcrypt.compare(password, user.password);
        if(!isMatch){
            return res.json({
                msg : "Password is wrong",
                success : false,
            })
        }


        const token = jwt.sign(
            { userId : user.id},
            "mere secret",
            { expiresIn: "7d" }
        )

        res.cookie("token",token,{
            maxAge: 7 * 24 * 60 * 60 * 1000         
        })


        return res.json({
            success : true,
            msg : "Login successful", 
        })


    }
    catch(err){
        return {
            success : false,
            msg : err.message
        }
    }
}


async function checkLoginStatus ( req ,res , next ) {
    try{
        const token = req.cookies.token;
        //console.log(token)
        if(!token){
            return res.json({
                success : false,
                msg : "Unathenticated"
            })
        }

        const decoded = jwt.verify(token , "mere secret");
        req.userId = decoded.userId;
        next();
    }
    catch(err){
        res.json({
            msg : err.message,
            success : false
        })
    }
}

async function Logout(req , res) {
    try {
        res.clearCookie("token", {
        });

        return res.json({
            success: true,
            msg: "Logged out successfully"
        })
    } catch (err) {
        return res.json({
            success: false,
            msg: err.message
        })
    }
}

async function searchUserByUserId(userId){
    try{
        const offset = users_userId_index_Tree.find(userId);

        if(offset === null || offset === undefined){
            return {
                msg : "User not found",
                success : false
            }
        }

        const fd = await fsp.open(userDbFile , "r");
        const buffer = Buffer.alloc(1024);
        const { bytesRead } = await fd.read(buffer , 0 , buffer.length , offset);
        await fd.close();

        const record = buffer
            .slice(0, bytesRead)
            .toString("utf8")
            .split("\n")[0];

        return {
            user : JSON.parse(record),
            success : true
        }    
    }
    catch(err){
        return {
            success : false,
            err : err.message
        }
    }
}

async function findUsersByPage(req, res){
    const { pageNumber , pageSize} = req.query;
    if(!pageNumber || !pageSize) {
        return res.json({
            success : false,
            msg : "Page number and page size both are required"
        })
    } 

    console.log(pageNumber)
    try{

        const values = await users_userId_index_Tree.findValuesByPage(pageNumber , pageSize);
        //console.log(values)
        if(values.length === 0 ){
            return res.json({
                users : [],
                success : true,
                msg : `No user found for page number ${pageNumber}`
            })
        }

        const fd = await fsp.open(userDbFile , "r");
        const users = [];

        for(let i = 0 ; i < values.length ; i++){

            let buffer = Buffer.alloc(0);
            let chunk = Buffer.alloc(256);
            let position = values[i].value ;

            while(true){
                const {bytesRead} = await fd.read(chunk , 0 , chunk.length , position);

                if(bytesRead === 0) break;

                buffer = Buffer.concat( [ buffer , chunk.slice(0 , bytesRead) ] );

                const newLineIndex = buffer.indexOf("\n");
                if(newLineIndex !== -1 ){
                    buffer = buffer.slice(0 , newLineIndex);
                    break;
                }

                position += bytesRead
            }
            

            //console.log(buffer.toString("utf-8"));
            users.push(buffer.toString("utf-8"));

        }

        //console.log("pageNumber " +pageNumber)
        //console.log("users " +users)

        await fd.close();

        return res.json({
            success : true,
            msg : `All users fetched for page ${pageNumber}`,
            users : users
        })

    }
    catch(err){
        return res.json({
            success : false,
            msg : err.message
        })
    }
}


async function createCollection(req, res) {
    try {
        const userId = req.userId
        let { name } = req.body

        if (!name) {
            return res.json({ success: false, msg: "Collection name is required" })
        }

        name = name.toLowerCase().trim()

        const last = name[name.length - 1]
        const secondLast = name[name.length - 2]
        const vowels = ["a","e","i","o","u"]

        if (last === "y" && !vowels.includes(secondLast)) {
            name = name.slice(0, -1) + "ies"
        } else if (!name.endsWith("s")) {
            name = name + "s"
        }

        const userAlreadyHas = collections_userId_name_index_Tree
            .checkValueInAMultiValueKey(userId, name)

        if (userAlreadyHas) {
            return res.json({
                success: false,
                msg: "Collection with this name already exists for this user"
            })
        }

        const dbDir = path.join(process.cwd(), "databasefiles")
        const filePath = path.join(dbDir, `${name}.jsonl`)
        const catalogPath = path.join(dbDir, "index.jsonl")

        let collectionExists = false

        if (fs.existsSync(catalogPath)) {
            const stream = fs.createReadStream(catalogPath, "utf8")
            const rl = readline.createInterface({ input: stream, crlfDelay: Infinity })

            for await (const line of rl) {
                if (!line) continue
                const entry = JSON.parse(line)
                if (entry.collectionName === name) {
                    collectionExists = true
                    break
                }
            }

            rl.close()
        }

        if (!collectionExists) {
            await fsp.open(filePath, "a").then(f => f.close())

            const newIndex = {
                collectionName: name,
                filePath,
                indexes: {
                    id: `${name}_id.idx`,
                    userId: `${name}_userId.idx`
                }
            }

            await fsp.appendFile(
                catalogPath,
                JSON.stringify(newIndex) + "\n",
                "utf8"
            )
        }

        const newCollection = {
            id: ulid(),
            name,
            createdAt: new Date().toISOString(),
            userId
        }

        const line = JSON.stringify(newCollection) + "\n"

        const fd = await fsp.open(collectionFile, "a+")
        const { size } = await fd.stat()
        const offset = size
        await fd.write(line, offset, "utf8")
        await fd.close()

        collections_id_index_Tree.insertMulti(newCollection.id, offset)
        collections_userId_index_Tree.insertMulti(userId, offset)
        collections_userId_name_index_Tree.insertMulti(userId, name)

       

        return res.json({
            success: true,
            msg: "Collection created",
            collection: newCollection
        })

    } catch (err) {
        return res.json({ success: false, msg: err.message })
    }
}

async function insertDataIntoUserCollection(req,res){
    try{
        const { collectionName , data  } = req.body;

        if(!collectionName || !data) {
            return res.json({
                success : false,
                msg : "Collection name and data both are required"
            })
        }

        if(!req.userId){
            return res.json({
                success : false,
                msg : "Unathenticated"
            })
        }

        const isExists = await collections_userId_name_index_Tree.checkValueInAMultiValueKey(req.userId , collectionName);
        if(!isExists){  
            return res.json({
                success : false,
                msg : "Collection with this name doesn't exists"
            })
        }   

        const fd = await fsp.open(path.join(dbDir , `users.jsonl`) , "a+");
        const { size } = await fd.stat();
        const offset = size;

        const newRecord = {
            id : ulid(),
            ...data,
            userId : req.userId,
            createdAt : new Date().toISOString()    
        }
        
        const line = JSON.stringify(newRecord) + "\n";

        await fd.write(line , offset , "utf-8");
        await fd.close();

        users_userId_index_Tree.insert(req.userId , offset);
        

        return res.json({
            success : true,
            msg : "Data inserted into collection"
        })      

        
    }
    catch(err){
        return res.json({
            success: false,
            msg: err.message
        })
    }
}

async function FindAllCollectionsByUserId(req,res){
    try{
        const userId = req.userId;
        const offsets = collections_userId_index_Tree.findAllValues(userId);
        //console.log(offsets)
        if(!offsets || offsets.length === 0 ){
            return res.json({
                success : true,
                msg : "No collections found",
                collections : []
            })
        }


        const fd = await fsp.open(collectionFile , "r");

        const collections = [];

        let buffer = Buffer.alloc(0);
        let chunk = Buffer.alloc(256);

        for(let i=0 ; i < offsets.length ; i++){
            let position = offsets[i];

            while(true){
                const { bytesRead } = await fd.read(chunk , 0 , chunk.length , position );
                if(bytesRead === 0 ) break;

                buffer = Buffer.concat( [ buffer , chunk.slice( 0 , bytesRead) ] );

                const newLineIndex = buffer.indexOf("\n");
                if(newLineIndex !== -1){
                    buffer = buffer.slice(0 , newLineIndex);
                    break;  
                }

                position += bytesRead;
            }

            collections.push( JSON.parse( buffer.toString("utf-8") ) );
            buffer = Buffer.alloc(0); 
            chunk = Buffer.alloc(256);  

        }

        await fd.close();

        return res.json({
            success : true,
            msg : "Collections fetched",
            collections
        })

    }
    catch(err){
        return res.json({
            success : false,
            msg : err.message
        })
    }
}


async function FindDataForCollectionIdViaPageNumber(req,res){
    const { collectionName , pageNumber , pageSize} = req.query;
    if(!collectionName || !pageNumber || !pageSize){
        return res.json({
            success : false,
            msg : "CollectionName , page number and page size all are required"
        })
    }   

    const isExists = await collections_userId_name_index_Tree.checkValueInAMultiValueKey(req.userId , collectionName);
    if(!isExists){  
        return res.json({
            success : false,
            msg : "Collection with this name doesn't exists"
        })
    }   





    try{

    }
    catch(err){
        return res.json({
            success : false,
            msg : err.message
        })  
    }
}

async function buildIndex(){
    try{

        if(!fs.existsSync(userDbFile)){
            await fsp.writeFile(userDbFile , "" , "utf-8");

            
            return {
                success : true,
                msg : "Empty DB file created, index empty"
            }
        }
        console.time("Building index for email and userid...")
        const stream = fs.createReadStream(userDbFile , { encoding: "utf8" });
        const rl = readline.createInterface({
           input: stream,
           crlfDelay: Infinity
        });

        let offset = 0 ;
        for await(const line of rl){
            if(!line.trim()) continue;
            const user = JSON.parse(line);
            let exists = users_userId_index_Tree.find(user.id) || users_email_index_Tree.find(user.email.toLowerCase());
            if(exists !== null){
                users_userId_index_Tree.delete(user.id);
                users_email_index_Tree.delete(user.email.toLowerCase());
            }
            users_userId_index_Tree.insert(user.id , offset);
            users_email_index_Tree.insert(user.email.toLowerCase() , offset)
            offset += Buffer.byteLength(line, "utf8") + 1;
        }

        console.log("Index built for email and userid")

        return {
            success : true,
            msg : "Index built"
        }

    }
    catch(err){
        return {
            msg : err.message,
            success : false
        }
    }
}

async function BuildIndexForCollections(){
    try{
        if(!fs.existsSync(collectionFile)){
            await fsp.writeFile(collectionFile , "" , "utf-8");
            return {
                success : true,
                msg : "Empty collection DB file created, index empty"
            }
        }

        const  stream = fs.createReadStream(collectionFile , { encoding : "utf-8"});
        const rl = readline.createInterface({
            input : stream,
            crlfDelay : Infinity
        });

        let  offset = 0;
        for await (const line of rl){
            if(!line.trim()) continue;

            const collection = JSON.parse(line);
            
            collections_id_index_Tree.insertMulti( collection.id , offset);
            collections_userId_index_Tree.insertMulti( collection.userId , offset);
            collections_userId_name_index_Tree.insertMulti( collection.userId , collection.name );

            const lineWithNewLine = line + "\n";
            offset += Buffer.byteLength(lineWithNewLine , "utf-8"); 

        }


        console.log("Index built for collections")
    }
    catch(err){
        console.log(err)
    }
}

async function BuildIndexForCollectionsExceptUserAndCollection(){
    try{
        const indexFile = fs.createReadStream(path.join(__dirname,".." ,"databasefiles", "index.jsonl") , { encoding : "utf-8"});
        const rl = readline.createInterface({
            input : indexFile,
            crlfDelay : Infinity
        });

        for await( const line of rl ){
            if(!line.trim()) continue;
            const indexEntry = JSON.parse(line);
            //console.log(indexEntry.indexes)
            for( const i in indexEntry.indexes ){
                //console.log(indexEntry.indexes[i]);
                const bplusTreeName = `${indexEntry.indexes[i]}_Tree`;
                //console.log(bplusTreeName);
                global[bplusTreeName] = new BPlusTree(10);

                const stream = fs.createReadStream( indexEntry.filePath, { encoding : "utf-8"});
                const rl2 = readline.createInterface({
                    input : stream,
                    crlfDelay : Infinity
                });

                let offset = 0;
                for await( let line of rl2){
                    if(!line.trim()) continue;
                    const record = JSON.parse(line);
                    //console.log(record.id)
                   const field = i ;
                   const key = record[field];
                   //console.log("Inserting key " + key + " in " + bplusTreeName);
                   if(key !== undefined ){
                        global[bplusTreeName].insert( key , offset);

                   }

                   const lineWithNewLine = line + "\n";
                   offset += Buffer.byteLength( lineWithNewLine , "utf-8");
                   //console.log("Offset updated of  " + bplusTreeName + " to " + offset);


                }

                console.log("Index built for " + bplusTreeName);
                //console.log(JSON.stringify(global[bplusTreeName]) , null , 2);
            }
        }
    }
    catch(err){
        console.log(err)
    }
}

setTimeout( async () => {
    BuildIndexForCollectionsExceptUserAndCollection()
},1000)

setTimeout( async () => {

console.log(JSON.stringify(global.products_id_index_Tree , null , 2));
console.log(JSON.stringify(global.products_userId_index_Tree , null , 2));

}, 5000);
async function seedOneMillion(count = 1000000){
    try{
        const stream = fs.createWriteStream(userDbFile , {
            flags :"a"
        })

        for(let i = 0 ; i < count ; i++){
            const newUser = new User({
                email : faker.internet.email().toLowerCase(),
                password : faker.internet.password(),
                id : ulid()
            })

            const line = JSON.stringify(newUser) + "\n";


            if (!stream.write(line)) {
               await new Promise(resolve => stream.once("drain", resolve));
           }
        }

        stream.end();

        return {
            success : true,
            msg : "A million user seeded"
        }
    }
    catch(err){
        return {
            success : false,
            msg : err.message
        }
    }
}

module.exports = {signUpUser , seedOneMillion , buildIndex , searchUserByUserId ,  Login , checkLoginStatus , Logout , verifyUserEmail , findUsersByPage , createCollection , FindAllCollectionsByUserId , BuildIndexForCollections , insertDataIntoUserCollection}