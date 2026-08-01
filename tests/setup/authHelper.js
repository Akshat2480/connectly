// tests/setup/authHelper.js
const request = require("supertest");
const app = require("../../app");

exports.registerAndLogin = async (overrides = {}) => {
  const user = {
    name: "Helper User",
    email: `user${Date.now()}@example.com`,
    password: "password123",
    passwordConfirm: "password123",
    ...overrides,
  };

  const res = await request(app).post("/api/v1/users/register").send(user);
  const cookie = res.headers["set-cookie"];

  return { cookie, user };
};
