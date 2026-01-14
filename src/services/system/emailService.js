const sgMail = require("@sendgrid/mail");
const { getVerificationEmailTemplate } = require("../../utils/emailTemplates"); 

if (!process.env.SENDGRID_API_KEY) {
    console.error("❌ FATAL: SENDGRID_API_KEY is missing in .env file");
} else {
    sgMail.setApiKey(process.env.SENDGRID_API_KEY);
}

async function sendVerificationEmail(toEmail, name, token) {
    const frontendUrl = process.env.FRONTEND_URL || "http://localhost:3000";
    const verificationLink = `${frontendUrl}/verify-email?token=${token}`;
    
    const fromEmail = process.env.EMAIL_FROM;
    if(!fromEmail) {
        console.error("❌ Error: EMAIL_FROM is missing in .env");
        return false;
    }

    const emailHtml = getVerificationEmailTemplate(name, verificationLink);

    const msg = {
        to: toEmail,
        from: fromEmail, 
        subject: "Verify your GigaDB account",
        html: emailHtml 
    };

    try {
        console.log(`📨 Attempting to send email to ${toEmail}...`);
        await sgMail.send(msg);
        console.log("✅ Email sent successfully");
        return true;
    } catch (error) {
        console.error("❌ Email Failed:");
        if (error.response) {
            console.error(JSON.stringify(error.response.body, null, 2));
        } else {
            console.error(error.message);
        }
        return false;
    }
}

module.exports = { sendVerificationEmail };