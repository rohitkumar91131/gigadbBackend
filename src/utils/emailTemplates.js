const LOGO_URL = "https://res.cloudinary.com/dkaxd3wha/image/upload/v1768068554/logo_ftfr6n.png";

const getVerificationEmailTemplate = (username, verificationLink) => {
  return `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8">
      <style>
        .button:hover { background-color: #333333 !important; }
      </style>
    </head>
    <body style="margin: 0; padding: 0; background-color: #f4f4f5; font-family: Arial, sans-serif;">
      
      <table role="presentation" width="100%" border="0" cellspacing="0" cellpadding="0" style="background-color: #f4f4f5;">
        <tr>
          <td align="center" style="padding: 40px 0;">
            
            <table role="presentation" width="600" border="0" cellspacing="0" cellpadding="0" style="background-color: #ffffff; border-radius: 8px; overflow: hidden; box-shadow: 0 4px 6px rgba(0,0,0,0.05); max-width: 600px; width: 100%;">
              
              <tr>
                <td align="center" style="padding: 30px 40px; background-color: #000000;">
                  <img src="${LOGO_URL}" alt="GigaDB Logo" width="120" style="display: block; color: #ffffff;">
                </td>
              </tr>
              
              <tr>
                <td style="padding: 40px;">
                  <h1 style="margin: 0 0 20px; font-size: 24px; color: #333333;">Verify your email address</h1>
                  <p style="margin: 0 0 20px; font-size: 16px; line-height: 1.5; color: #555555;">
                    Hi ${username},
                  </p>
                  <p style="margin: 0 0 30px; font-size: 16px; line-height: 1.5; color: #555555;">
                    Thanks for starting with GigaDB! We want to make sure it's really you. Please click the button below to verify your email address.
                  </p>
                  
                  <table role="presentation" border="0" cellspacing="0" cellpadding="0">
                    <tr>
                      <td align="center" bgcolor="#000000" style="border-radius: 6px;">
                        <a href="${verificationLink}" class="button" target="_blank" style="display: inline-block; padding: 14px 30px; font-size: 16px; font-weight: bold; color: #ffffff; text-decoration: none; border-radius: 6px; background-color: #000000; border: 1px solid #000000;">
                          Verify Email
                        </a>
                      </td>
                    </tr>
                  </table>
                  
                  <p style="margin: 30px 0 0; font-size: 14px; color: #888888;">
                    This link will expire in 1 hour. If you didn't create an account, you can safely ignore this email.
                  </p>
                </td>
              </tr>
              
              <tr>
                <td style="padding: 20px 40px; background-color: #f9f9f9; text-align: center; font-size: 12px; color: #888888;">
                  <p style="margin: 0;">© ${new Date().getFullYear()} GigaDB. All rights reserved.</p>
                  <p style="margin: 5px 0 0;">You received this email because you signed up for GigaDB.</p>
                </td>
              </tr>
              
            </table>
            </td>
        </tr>
      </table>
      
    </body>
    </html>
  `;
};

module.exports = { getVerificationEmailTemplate };