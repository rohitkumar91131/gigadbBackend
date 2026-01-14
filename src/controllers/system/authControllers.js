const authService = require("../../services/system/authServices");

exports.signup = async (req, res) => {
    try {
        const result = await authService.register(req.body.email, req.body.password);
        res.status(201).json({ success: true, ...result });
    } catch (err) {
        res.status(400).json({ success: false, msg: err.message });
    }
};

exports.login = async (req, res) => {
    try {
        const { token, user } = await authService.login(req.body.email, req.body.password);

        res.cookie("token", token, {
            httpOnly: true, 
            secure: process.env.NODE_ENV === "production", 
            maxAge: 7 * 24 * 60 * 60 * 1000
        });

        res.json({ success: true, msg: "Login successful", user });
    } catch (err) {
        res.status(401).json({ success: false, msg: err.message });
    }
};

exports.logout = (req, res) => {
    res.clearCookie("token");
    res.json({ success: true, msg: "Logged out" });
};

exports.verifyEmail = async (req, res) => {
    try {
        const token = req.body?.token || req.query?.token;

        if (!token) {
            return res.status(400).json({ success: false, msg: "Token is required" });
        }

        const result = await authService.verifyEmail(token);
        res.json({ success: true, ...result });

    } catch (err) {
        console.error("Verification Error:", err.message);
        res.status(400).json({ success: false, msg: err.message });
    }
};

exports.getMe = async (req, res) => {
    // Since middleware added userId, we can fetch user details if needed
    // or just confirm validity
    res.json({ success: true, userId: req.userId, msg: "You are authenticated" });
};