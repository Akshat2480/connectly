// mocks sendEmail
jest.mock("../../utils/email", () => ({
  sendEmail: jest.fn().mockResolvedValue(true),
}));

const request = require("supertest");
const crypto = require("crypto");
const app = require("../../app");
const User = require("../../models/userModel");
const { sendEmail } = require("../../utils/email");
const { connect, closeDatabase, clearDatabase } = require("../setup/testDb");

beforeAll(async () => await connect());
afterEach(async () => {
  await clearDatabase();
  jest.clearAllMocks();
});
afterAll(async () => await closeDatabase());

const validUser = {
  name: "Test User",
  email: "test@example.com",
  password: "password123",
  passwordConfirm: "password123",
};

describe("POST /api/v1/users/register", () => {
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

    expect(res.status).toBe(500);
  });

  it("rejects a password shorter than 8 characters", async () => {
    const res = await request(app)
      .post("/api/v1/users/register")
      .send({ ...validUser, password: "short", passwordConfirm: "short" });

    expect(res.status).toBe(400);
  });

  it("rejects an invalid email format", async () => {
    const res = await request(app)
      .post("/api/v1/users/register")
      .send({ ...validUser, email: "not-an-email" });

    expect(res.status).toBe(400);
  });

  it("rejects a missing name", async () => {
    const { name, ...rest } = validUser;
    const res = await request(app).post("/api/v1/users/register").send(rest);

    expect(res.status).toBe(400);
  });
});

describe("POST /api/v1/users/login", () => {
  beforeEach(async () => {
    await request(app).post("/api/v1/users/register").send(validUser);
  });

  it("logs in with correct credentials", async () => {
    const res = await request(app)
      .post("/api/v1/users/login")
      .send({ email: validUser.email, password: validUser.password });

    expect(res.status).toBe(200);
    expect(res.body.message).toBe("Logged in successful");
    expect(res.headers["set-cookie"]).toBeDefined();
  });

  it("rejects wrong password", async () => {
    const res = await request(app)
      .post("/api/v1/users/login")
      .send({ email: validUser.email, password: "wrongpassword" });

    expect(res.status).toBe(401);
  });

  it("rejects a non-existent email", async () => {
    const res = await request(app)
      .post("/api/v1/users/login")
      .send({ email: "nobody@example.com", password: validUser.password });

    expect(res.status).toBe(401);
  });

  it("rejects an invalid email format", async () => {
    const res = await request(app)
      .post("/api/v1/users/login")
      .send({ email: "not-an-email", password: validUser.password });

    expect(res.status).toBe(400);
  });
});

describe("POST /api/v1/users/logout", () => {
  it("requires authentication", async () => {
    const res = await request(app).post("/api/v1/users/logout");
    expect(res.status).toBe(401);
  });

  it("clears the jwt cookie when authenticated", async () => {
    const registerRes = await request(app)
      .post("/api/v1/users/register")
      .send(validUser);
    const cookie = registerRes.headers["set-cookie"];

    const res = await request(app)
      .post("/api/v1/users/logout")
      .set("Cookie", cookie);

    expect(res.status).toBe(200);
    expect(res.body.message).toBe("Logged out successful");
    expect(res.headers["set-cookie"][0]).toMatch(/jwt=logged-out/);
  });
});

describe("POST /api/v1/users/forgotPassword", () => {
  beforeEach(async () => {
    await request(app).post("/api/v1/users/register").send(validUser);
  });

  it("sends a reset email for an existing user", async () => {
    const res = await request(app)
      .post("/api/v1/users/forgotPassword")
      .send({ email: validUser.email });

    expect(res.status).toBe(200);
    expect(res.body.message).toBe(
      "Password reset link has been sent to your email",
    );
    expect(sendEmail).toHaveBeenCalledTimes(1);
    expect(sendEmail).toHaveBeenCalledWith(
      expect.objectContaining({ to: validUser.email }),
    );
  });

  it("returns 404 for a non-existent email", async () => {
    const res = await request(app)
      .post("/api/v1/users/forgotPassword")
      .send({ email: "doesnotexist@example.com" });

    expect(res.status).toBe(404);
    expect(sendEmail).not.toHaveBeenCalled();
  });

  it("clears the reset token if sending the email fails", async () => {
    sendEmail.mockRejectedValueOnce(new Error("SMTP down"));

    const res = await request(app)
      .post("/api/v1/users/forgotPassword")
      .send({ email: validUser.email });

    expect(res.status).toBe(500);

    const user = await User.findOne({ email: validUser.email });
    expect(user.passwordResetToken).toBeUndefined();
    expect(user.passwordResetExpires).toBeUndefined();
  });
});

describe("POST /api/v1/users/resetPassword/:resetToken", () => {
  let resetToken;

  beforeEach(async () => {
    await request(app).post("/api/v1/users/register").send(validUser);

    const user = await User.findOne({ email: validUser.email });
    resetToken = crypto.randomBytes(32).toString("hex");
    user.passwordResetToken = crypto
      .createHash("sha256")
      .update(resetToken)
      .digest("hex");
    user.passwordResetExpires = Date.now() + 10 * 60 * 1000;
    await user.save({ validateBeforeSave: false });
  });

  it("resets the password with a valid token", async () => {
    const res = await request(app)
      .post(`/api/v1/users/resetPassword/${resetToken}`)
      .send({ password: "newpassword123", passwordConfirm: "newpassword123" });

    expect(res.status).toBe(200);
    expect(res.headers["set-cookie"]).toBeDefined();

    // confirm old password no longer works
    const loginRes = await request(app)
      .post("/api/v1/users/login")
      .send({ email: validUser.email, password: validUser.password });
    expect(loginRes.status).toBe(401);

    // confirm new password works
    const newLoginRes = await request(app)
      .post("/api/v1/users/login")
      .send({ email: validUser.email, password: "newpassword123" });
    expect(newLoginRes.status).toBe(200);
  });

  it("rejects an invalid/unknown token", async () => {
    const res = await request(app)
      .post("/api/v1/users/resetPassword/not-a-real-token")
      .send({ password: "newpassword123", passwordConfirm: "newpassword123" });

    expect(res.status).toBe(404);
  });

  it("rejects an expired token", async () => {
    const user = await User.findOne({ email: validUser.email });
    user.passwordResetExpires = Date.now() - 1000; // already expired
    await user.save({ validateBeforeSave: false });

    const res = await request(app)
      .post(`/api/v1/users/resetPassword/${resetToken}`)
      .send({ password: "newpassword123", passwordConfirm: "newpassword123" });

    expect(res.status).toBe(404);
  });

  it("rejects mismatched passwordConfirm", async () => {
    const res = await request(app)
      .post(`/api/v1/users/resetPassword/${resetToken}`)
      .send({ password: "newpassword123", passwordConfirm: "different" });

    expect(res.status).toBe(400);
  });
});
