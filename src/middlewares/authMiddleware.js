const jwt = require("jsonwebtoken");

exports.isAuthenticated = (req, res, next) => {
    try {
        const token = req.cookies.token || req.headers['authorization']?.split(' ')[1];

        if (!token) {
            return res.status(401).json({ success: false, msg: "Unauthenticated" });
        }

        const decoded = jwt.verify(token, process.env.JWT_SECRET || "mere secret");
        req.userId = decoded.userId;
        next();
    } catch (err) {
        return res.status(401).json({ success: false, msg: "Invalid Token" });
    }
};