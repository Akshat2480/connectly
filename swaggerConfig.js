const swaggerJsdoc = require("swagger-jsdoc");

const options = {
  definition: {
    openapi: "3.0.0",
    info: {
      title: "Connectly API",
      version: "1.0.0",
      description: "Social media API — users, posts, comments, notifications",
    },
    servers: [{ url: "/api/v1" }],
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
