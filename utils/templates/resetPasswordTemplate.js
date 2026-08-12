module.exports = (name, resetURL) => {
  return `
    <!DOCTYPE html>
    <html lang="en">
      <head>
        <meta charset="UTF-8" />
        <meta name="viewport" content="width=device-width, initial-scale=1.0" />
        <title>Reset Your Password</title>
      </head>

      <body
        style="
          margin: 0;
          padding: 0;
          background-color: #f4f4f4;
          font-family: Arial, Helvetica, sans-serif;
        "
      >
        <table
          role="presentation"
          width="100%"
          cellspacing="0"
          cellpadding="0"
          style="padding: 40px 0;"
        >
          <tr>
            <td align="center">
              <table
                role="presentation"
                width="600"
                cellspacing="0"
                cellpadding="0"
                style="
                  background: #ffffff;
                  border-radius: 12px;
                  overflow: hidden;
                "
              >
                <!-- Header -->
                <tr>
                  <td
                    align="center"
                    style="
                      background: #dc2626;
                      color: white;
                      padding: 30px;
                    "
                  >
                    <h1 style="margin: 0;">🔒 Password Reset Request</h1>
                  </td>
                </tr>

                <!-- Body -->
                <tr>
                  <td style="padding: 40px;">
                    <h2 style="margin-top: 0;">
                      Hi ${name},
                    </h2>

                    <p style="font-size: 16px; line-height: 1.6;">
                      We received a request to reset the password for your
                      <strong>Connectly</strong> account.
                    </p>

                    <p style="font-size: 16px; line-height: 1.6;">
                      Click the button below to create a new password.
                      This link will expire in <strong>10 minutes</strong>.
                    </p>

                    <!-- Reset Button -->
                    <div style="text-align: center; margin: 40px 0;">
                      <a
                        href="${resetURL}"
                        style="
                          display: inline-block;
                          padding: 14px 28px;
                          background: #dc2626;
                          color: white;
                          text-decoration: none;
                          border-radius: 8px;
                          font-weight: bold;
                          font-size: 16px;
                        "
                      >
                        Reset Password
                      </a>
                    </div>

                    <p style="font-size: 15px; line-height: 1.6;">
                      If the button doesn't work, copy and paste this URL into
                      your browser:
                    </p>

                    <div
                      style="
                        background: #f8f9fa;
                        border: 1px solid #e5e7eb;
                        border-radius: 8px;
                        padding: 16px;
                        margin: 20px 0;
                        word-break: break-all;
                        color: #2563eb;
                        font-size: 14px;
                      "
                    >
                      ${resetURL}
                    </div>

                    <p
                      style="
                        font-size: 15px;
                        line-height: 1.6;
                        color: #555;
                      "
                    >
                      If you didn't request this password reset, you can safely
                      ignore this email. Your password will remain unchanged.
                    </p>

                    <hr
                      style="
                        border: none;
                        border-top: 1px solid #e5e7eb;
                        margin: 30px 0;
                      "
                    />

                    <p
                      style="
                        font-size: 13px;
                        color: #999;
                        text-align: center;
                        margin: 0;
                      "
                    >
                      © ${new Date().getFullYear()} Connectly. All rights
                      reserved.
                    </p>

                    <p
                      style="
                        font-size: 12px;
                        color: #999;
                        text-align: center;
                        margin-top: 10px;
                      "
                    >
                      This is an automated email. Please do not reply.
                    </p>
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
