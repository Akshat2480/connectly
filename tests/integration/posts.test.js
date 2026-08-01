// tests/integration/posts.test.js
const request = require("supertest");
const app = require("../../app");
const { connect, closeDatabase, clearDatabase } = require("../setup/testDb");
const { registerAndLogin } = require("../setup/authHelper");

beforeAll(async () => await connect());
afterEach(async () => await clearDatabase());
afterAll(async () => await closeDatabase());

describe("POST /api/v1/posts", () => {
  it("requires authentication", async () => {
    const res = await request(app)
      .post("/api/v1/posts")
      .send({ content: "hello world" });

    expect(res.status).toBe(401);
  });

  it("creates a post when authenticated", async () => {
    const { cookie } = await registerAndLogin();

    const res = await request(app)
      .post("/api/v1/posts")
      .set("Cookie", cookie)
      .send({ content: "My first post" });

    expect(res.status).toBe(201);
    expect(res.body.data.data.content).toBe("My first post");
  });

  it("rejects content over 500 characters", async () => {
    const { cookie } = await registerAndLogin();

    const res = await request(app)
      .post("/api/v1/posts")
      .set("Cookie", cookie)
      .send({ content: "a".repeat(501) });

    expect(res.status).toBe(400);
  });
});

describe("PATCH /api/v1/posts/:id/like", () => {
  it("toggles a like on and off", async () => {
    const { cookie } = await registerAndLogin();

    const createRes = await request(app)
      .post("/api/v1/posts")
      .set("Cookie", cookie)
      .send({ content: "Like me" });

    const postId = createRes.body.data.data._id;

    const likeRes = await request(app)
      .patch(`/api/v1/posts/${postId}/like`)
      .set("Cookie", cookie);
    expect(likeRes.body.like).toBe(true);

    const unlikeRes = await request(app)
      .patch(`/api/v1/posts/${postId}/like`)
      .set("Cookie", cookie);
    expect(unlikeRes.body.like).toBe(false);
  });
});
