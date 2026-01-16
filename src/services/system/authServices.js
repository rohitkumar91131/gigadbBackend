const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const { ulid } = require("ulid");
const userDb = require("../../db/SystemUsersDb")
const emailService = require("../../services/system/emailService");

const JWT_SECRET = process.env.JWT_SECRET || "fallback_secret";
const TEMP_SECRET = process.env.TEMP_SECRET || "fallback_temp";

const generateToken = (userId) => {
    return jwt.sign({ userId }, JWT_SECRET, { expiresIn: process.env.JWT_EXPIRES_IN });
};

exports.register = async (email, password) => {
    if (!email || !password) throw new Error("Email and password required");

    const existingUser = await userDb.findByEmail(email);
    if (existingUser) throw new Error("User already exists");

    const hashedPassword = await bcrypt.hash(password, 10);
    const newUser = {
        id: ulid(),
        email: email.toLowerCase(),
        password: hashedPassword,
        emailVerified: false,
        createdAt: new Date().toISOString()
    };

    await userDb.createUser(newUser);

    const verificationToken = jwt.sign(
        { userId: newUser.id, email: newUser.email },
        TEMP_SECRET,
        { expiresIn: process.env.EMAIL_EXPIRES_IN || "1h" }
    );
    
    emailService.sendVerificationEmail(newUser.email, newUser.email.split('@')[0], verificationToken)
        .catch(err => console.error("Email send failed:", err));

    return { msg: "User registered. Please check email." };
};

exports.login = async (email, password) => {
    const user = await userDb.findByEmail(email);
    if (!user) throw new Error("Invalid credentials");

    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) throw new Error("Invalid credentials");

    if (!user.emailVerified) {
        // Option: throw new Error("Please verify your email first");
    }

    const token = generateToken(user.id);
    return { token, user: { id: user.id, email: user.email } };
};



exports.verifyEmail = async (token) => {
    try {
        const decoded = jwt.verify(token, TEMP_SECRET);
        const { email, userId } = decoded;

        const user = await userDb.findByEmail(email);
        if (!user) throw new Error("User not found.");

        if (String(user.id) !== String(userId)) {
            throw new Error("Token ownership mismatch.");
        }

        if (user.emailVerified) {
            return { msg: "Email is already verified." };
        }

        await userDb.markEmailVerified(userId, email);
        return { msg: "Email verified successfully" };

    } catch (err) {
        console.error("Verification Service Error:", err.message);
        if (err.name === "TokenExpiredError") throw new Error("Link expired.");
        if (err.name === "JsonWebTokenError") throw new Error("Invalid link.");
        throw err;
    }
};