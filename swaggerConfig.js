const swaggerJsdoc = require("swagger-jsdoc");

const PORT = process.env.PORT || 8000;
const API_BASE_URL =
  process.env.API_BASE_URL || `http://127.0.0.1:${PORT}/api/v1`;

const options = {
  definition: {
    openapi: "3.0.0",
    info: {
      title: "Connectly API",
      version: "1.0.0",
      description: "Social media API — users, posts, comments, notifications",
    },
    servers: [{ url: API_BASE_URL }],
    components: {
      securitySchemes: {
        cookieAuth: { type: "apiKey", in: "cookie", name: "jwt" },
      },
    },
    security: [{ cookieAuth: [] }],
  },
  apis: ["./docs/*.yaml"],
};

module.exports = swaggerJsdoc(options);
