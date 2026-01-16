const path = require("path");
const fs = require("fs");
const readline = require("readline");
const BPlusTree = require("./BPlusTree"); 
const { readRecord, appendRecord } = require("./fileUtils");

const dbDir = path.join(process.cwd(), "databasefiles" , "system");
const userDbFile = path.join(dbDir, "users.jsonl");
const { users_userId_index_Tree ,users_email_index_Tree  } = require("./indexStore");

if (!fs.existsSync(dbDir)) fs.mkdirSync(dbDir, { recursive: true });
if (!fs.existsSync(userDbFile)) fs.writeFileSync(userDbFile, "");


async function buildUserIndex() {
    console.time("Building User Index");
    const stream = fs.createReadStream(userDbFile, { encoding: "utf8" });
    const rl = readline.createInterface({ input: stream, crlfDelay: Infinity });

    let offset = 0;
    for await (const line of rl) {
        if (!line.trim()) continue;
        const user = JSON.parse(line);
        
        // users_userId_index_Tree.delete(user.id);
        // users_email_index_Tree.delete(user.email.toLowerCase());

        users_userId_index_Tree.insert(user.id, offset);
        users_email_index_Tree.insert(user.email.toLowerCase(), offset);

        offset += Buffer.byteLength(line, "utf8") + 1; 
    }
    console.timeEnd("Building User Index");
}

async function findByEmail(email) {
    const offset = users_email_index_Tree.find(email.toLowerCase());
    if (offset === null || offset === undefined) return null;
    return await readRecord(userDbFile, offset);
}

async function findById(id) {
    const offset = users_userId_index_Tree.find(id);
    if (offset === null || offset === undefined) return null;
    return await readRecord(userDbFile, offset);
}

async function createUser(userData) {
    const offset = await appendRecord(userDbFile, userData);
    
    users_userId_index_Tree.insert(userData.id, offset);
    users_email_index_Tree.insert(userData.email.toLowerCase(), offset);
    
    return userData;
}


async function markEmailVerified(userId, email) {
    const user = await findById(userId);
    if(!user) return null;

    user.emailVerified = true;
    
    const newOffset = await appendRecord(userDbFile, user);

    users_email_index_Tree.delete(email);
    users_userId_index_Tree.delete(userId);

    users_email_index_Tree.insert(email, newOffset);
    users_userId_index_Tree.insert(userId, newOffset);

    return user;
}

module.exports = {
    buildUserIndex,
    findByEmail,
    findById,
    createUser,
    markEmailVerified
};