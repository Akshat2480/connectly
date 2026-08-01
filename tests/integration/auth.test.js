// tests/integration/auth.test.js
const request = require("supertest");
const app = require("../../app");
const User = require("../../models/userModel");
const { connect, closeDatabase, clearDatabase } = require("../setup/testDb");

beforeAll(async () => await connect());
afterEach(async () => await clearDatabase());
afterAll(async () => await closeDatabase());

describe("POST /api/v1/users/register", () => {
  const validUser = {
    name: "Test User",
    email: "test@example.com",
    password: "password123",
    passwordConfirm: "password123",
  };

  it("registers a user with valid data and sets a jwt cookie", async () => {
    const res = await request(app)
      .post("/api/v1/users/register")
      .send(validUser);

    expect(res.status).toBe(201);
    expect(res.body.message).toBe("Signed up successful");
    expect(res.headers["set-cookie"]).toBeDefined();

    const userInDb = await User.findOne({ email: validUser.email });
    expect(userInDb).not.toBeNull();
    expect(userInDb.password).not.toBe(validUser.password); // hashed
  });

  it("rejects mismatched passwordConfirm at the validator layer", async () => {
    const res = await request(app)
      .post("/api/v1/users/register")
      .send({ ...validUser, passwordConfirm: "different" });

    expect(res.status).toBe(400);
    expect(res.body.errors).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          // field: "passwordConfirm",
          message: "Passwords do not match",
        }),
      ]),
    );
  });

  it("rejects duplicate email", async () => {
    await request(app).post("/api/v1/users/register").send(validUser);
    const res = await request(app)
      .post("/api/v1/users/register")
      .send(validUser);

    // Your errorController maps err.code 11000 -> 400 "Already in use"
    expect(res.status).toBe(400);
  });
});

describe("POST /api/v1/users/login", () => {
  const credentials = {
    name: "Login User",
    email: "login@example.com",
    password: "password123",
    passwordConfirm: "password123",
  };

  beforeEach(async () => {
    await request(app).post("/api/v1/users/register").send(credentials);
  });

  it("logs in with correct credentials", async () => {
    const res = await request(app)
      .post("/api/v1/users/login")
      .send({ email: credentials.email, password: credentials.password });

    expect(res.status).toBe(200);
    expect(res.headers["set-cookie"]).toBeDefined();
  });

  it("rejects wrong password", async () => {
    const res = await request(app)
      .post("/api/v1/users/login")
      .send({ email: credentials.email, password: "wrongpassword" });

    expect(res.status).toBe(401);
  });
});
