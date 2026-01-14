require("dotenv").config();
const http = require('http'); 
const app = require("./src/app"); 
const { buildUserIndex } = require("./src/db/usersDb");

const PORT = process.env.PORT || 3000;
const server = http.createServer(app);

async function startServer() {
    try {
        console.log("Initializing Database...");
        
        await buildUserIndex();
        
        console.log("Database Indexes Ready.");

        server.listen(PORT, () => {
            console.log(`Server running on port ${PORT}`);
        });
    } catch (err) {
        console.error("Failed to start server:", err);
        process.exit(1);
    }
}

startServer();