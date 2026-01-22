const express = require('express');
const cors = require('cors');
const morgan = require('morgan'); 
const cookieParser = require("cookie-parser"); 
const systemAuthRoutes = require('./routes/system/authRoutes');
const collectionRoutes = require('./routes/system/collectionRoutes');
const userDataRoutes = require("./routes/UserData/userDataRoutes");
const apiKeyRoutes = require("./routes/apiKey.routes");
const app = express();

app.use(cors({
    origin: process.env.FRONTEND_URL, 
    credentials: true,               
    methods: ["GET", "POST", "PUT", "DELETE"],
    allowedHeaders: ["Content-Type", "Authorization"]
}));
app.use(morgan('dev'));
app.use(express.json());
app.use(cookieParser());


app.use('/sys/auth', systemAuthRoutes); 
app.use('/sys/collections',collectionRoutes );
app.use("/db/collections" , userDataRoutes)
app.use("/apikey",apiKeyRoutes);

app.get('/', (req, res) => {
    res.json({ message: 'API v1 is working!' });
});

app.use((req, res, next) => {
    res.status(404).json({ message: 'Route not found' });
});

module.exports = app;