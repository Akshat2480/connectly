module.exports = ({ name }) => {
  return `
    <!DOCTYPE html>
    <html lang="en">
      <head>
        <meta charset="UTF-8" />
        <meta name="viewport" content="width=device-width, initial-scale=1.0" />
        <title>Welcome to Connectly</title>
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
                <tr>
                  <td
                    align="center"
                    style="
                      background: #2563eb;
                      color: white;
                      padding: 30px;
                    "
                  >
                    <h1 style="margin: 0;">Welcome to Connectly 🎉</h1>
                  </td>
                </tr>

                <tr>
                  <td style="padding: 40px;">
                    <h2 style="margin-top: 0;">
                      Hi ${name},
                    </h2>

                    <p style="font-size: 16px; line-height: 1.6;">
                      Welcome to <strong>Connectly</strong>! We're excited to
                      have you join our community.
                    </p>

                    <p style="font-size: 16px; line-height: 1.6;">
                      Share posts, connect with friends, and discover amazing
                      content from people around the world.
                    </p>

                    <div style="text-align: center; margin: 40px 0;">
                      <a
                        href="${process.env.CLIENT_URL}"
                        style="
                          display: inline-block;
                          padding: 14px 28px;
                          background: #2563eb;
                          color: white;
                          text-decoration: none;
                          border-radius: 8px;
                          font-weight: bold;
                        "
                      >
                        Open Connectly
                      </a>
                    </div>

                    <p style="font-size: 14px; color: #666;">
                      If you didn't create this account, you can safely ignore
                      this email.
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
                      "
                    >
                      © ${new Date().getFullYear()} Connectly. All rights reserved.
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
