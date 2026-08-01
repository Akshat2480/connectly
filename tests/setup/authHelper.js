const request = require("supertest");
const app = require("../../app");
const User = require("../../models/userModel");

exports.registerAndLogin = async (overrides = {}) => {
  const user = {
    name: "Helper User",
    email: `user${Date.now()}_${Math.random().toString(36).slice(2)}@example.com`,
    password: "password123",
    passwordConfirm: "password123",
    ...overrides,
  };

  const res = await request(app).post("/api/v1/users/register").send(user);
  const cookie = res.headers["set-cookie"];
  const dbUser = await User.findOne({ email: user.email });

  return { cookie, user, userId: dbUser._id.toString() };
};
