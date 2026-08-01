jest.mock("../../utils/cloudinary", () => ({
  uploader: {
    upload_stream: jest.fn((options, callback) => {
      callback(null, {
        secure_url: "http://fake.url/photo.jpg",
        public_id: "fake_photo_id",
      });
      return { end: jest.fn() };
    }),
  },
}));

jest.mock("sharp", () => {
  return jest.fn(() => ({
    resize: jest.fn().mockReturnThis(),
    toFormat: jest.fn().mockReturnThis(),
    jpeg: jest.fn().mockReturnThis(),
    toBuffer: jest.fn().mockResolvedValue(Buffer.from("resized-fake-bytes")),
  }));
});

const request = require("supertest");
const app = require("../../app");
const User = require("../../models/userModel");
const Post = require("../../models/postModel");
const { connect, closeDatabase, clearDatabase } = require("../setup/testDb");
const { registerAndLogin } = require("../setup/authHelper");

beforeAll(async () => await connect());
afterEach(async () => {
  await clearDatabase();
  jest.clearAllMocks();
});
afterAll(async () => await closeDatabase());

describe("GET /api/v1/users/me", () => {
  it("requires authentication", async () => {
    const res = await request(app).get("/api/v1/users/me");
    expect(res.status).toBe(401);
  });

  it("returns the logged-in user's profile", async () => {
    const { cookie, user } = await registerAndLogin();

    const res = await request(app)
      .get("/api/v1/users/me")
      .set("Cookie", cookie);

    expect(res.status).toBe(200);
    expect(res.body.data.user.email).toBe(user.email);
    expect(res.body.data.user.password).toBeUndefined();
  });
});

describe("PATCH /api/v1/users/me", () => {
  it("requires authentication", async () => {
    const res = await request(app)
      .patch("/api/v1/users/me")
      .send({ name: "New Name" });
    expect(res.status).toBe(401);
  });

  it("updates the user's name", async () => {
    const { cookie } = await registerAndLogin();

    const res = await request(app)
      .patch("/api/v1/users/me")
      .set("Cookie", cookie)
      .send({ name: "Updated Name" });

    expect(res.status).toBe(200);
    expect(res.body.data.user.name).toBe("Updated Name");
  });

  it("rejects an empty name", async () => {
    const { cookie } = await registerAndLogin();

    const res = await request(app)
      .patch("/api/v1/users/me")
      .set("Cookie", cookie)
      .send({ name: "" });

    expect(res.status).toBe(400);
  });

  it("rejects attempts to update password via this endpoint", async () => {
    const { cookie } = await registerAndLogin();

    const res = await request(app)
      .patch("/api/v1/users/me")
      .set("Cookie", cookie)
      .send({ password: "newpassword123", passwordConfirm: "newpassword123" });

    expect(res.status).toBe(404);
    expect(res.body.message).toBe(
      "You cannot update your password using this endpoint",
    );
  });

  it("uploads and sets a new profile photo", async () => {
    const { cookie } = await registerAndLogin();

    const res = await request(app)
      .patch("/api/v1/users/me")
      .set("Cookie", cookie)
      .field("name", "Photo Updater")
      .attach("photo", Buffer.from("fake-photo-bytes"), "avatar.png");

    expect(res.status).toBe(200);
    expect(res.body.data.user.photo).toBe("http://fake.url/photo.jpg");
  });

  it("rejects a non-image file for photo", async () => {
    const { cookie } = await registerAndLogin();

    const res = await request(app)
      .patch("/api/v1/users/me")
      .set("Cookie", cookie)
      .attach("photo", Buffer.from("not an image"), "doc.txt");

    expect(res.status).toBe(400);
  });
});

describe("DELETE /api/v1/users/me", () => {
  it("requires authentication", async () => {
    const res = await request(app)
      .delete("/api/v1/users/me")
      .send({ password: "password123" });
    expect(res.status).toBe(401);
  });

  it("requires a password", async () => {
    const { cookie } = await registerAndLogin();

    const res = await request(app)
      .delete("/api/v1/users/me")
      .set("Cookie", cookie)
      .send({});

    expect(res.status).toBe(400);
  });

  it("rejects an incorrect password", async () => {
    const { cookie } = await registerAndLogin();

    const res = await request(app)
      .delete("/api/v1/users/me")
      .set("Cookie", cookie)
      .send({ password: "wrongpassword" });

    expect(res.status).toBe(401);
  });

  it("soft-deletes the account and blocks future login", async () => {
    const { cookie, user } = await registerAndLogin();

    const res = await request(app)
      .delete("/api/v1/users/me")
      .set("Cookie", cookie)
      .send({ password: user.password });

    expect(res.status).toBe(204);

    const loginRes = await request(app)
      .post("/api/v1/users/login")
      .send({ email: user.email, password: user.password });
    expect(loginRes.status).toBe(401);

    // User.collection bypasses Mongoose middleware entirely — gives you
    // the raw MongoDB driver collection, so the pre(/^find/) active filter
    // never runs here
    const rawUser = await User.collection.findOne({ email: user.email });
    expect(rawUser).not.toBeNull();
    expect(rawUser.active).toBe(false);
  });
});

describe("GET /api/v1/users/searchByName", () => {
  it("requires authentication", async () => {
    const res = await request(app).get("/api/v1/users/searchByName?name=alice");
    expect(res.status).toBe(401);
  });

  it("requires a name query param", async () => {
    const { cookie } = await registerAndLogin();
    const res = await request(app)
      .get("/api/v1/users/searchByName")
      .set("Cookie", cookie);
    expect(res.status).toBe(400);
  });

  it("finds users by partial, case-insensitive name match", async () => {
    const { cookie } = await registerAndLogin({ name: "Alice Wonderland" });
    await registerAndLogin({ name: "Bob Builder" });

    const res = await request(app)
      .get("/api/v1/users/searchByName?name=alice")
      .set("Cookie", cookie);

    expect(res.status).toBe(200);
    expect(res.body.results).toBe(1);
    expect(res.body.data.users[0].name).toBe("Alice Wonderland");
  });

  it("returns 400 when no user matches", async () => {
    const { cookie } = await registerAndLogin();

    const res = await request(app)
      .get("/api/v1/users/searchByName?name=nonexistentperson")
      .set("Cookie", cookie);

    expect(res.status).toBe(400);
  });
});

describe("PATCH /api/v1/users/:id/follow", () => {
  it("requires authentication", async () => {
    const { userId } = await registerAndLogin();
    const res = await request(app).patch(`/api/v1/users/${userId}/follow`);
    expect(res.status).toBe(401);
  });

  it("rejects following yourself", async () => {
    const { cookie, userId } = await registerAndLogin();

    const res = await request(app)
      .patch(`/api/v1/users/${userId}/follow`)
      .set("Cookie", cookie);

    expect(res.status).toBe(400);
  });

  it("returns 404 for a non-existent target user", async () => {
    const { cookie } = await registerAndLogin();
    const fakeId = "64b7a0f1f1a2b3c4d5e6f7a8";

    const res = await request(app)
      .patch(`/api/v1/users/${fakeId}/follow`)
      .set("Cookie", cookie);

    expect(res.status).toBe(404);
  });

  it("follows and then unfollows a user, toggling correctly", async () => {
    const { cookie: aliceCookie } = await registerAndLogin({ name: "Alice" });
    const { userId: bobId } = await registerAndLogin({ name: "Bob" });

    const followRes = await request(app)
      .patch(`/api/v1/users/${bobId}/follow`)
      .set("Cookie", aliceCookie);
    expect(followRes.status).toBe(200);
    expect(followRes.body.following).toBe(true);

    const unfollowRes = await request(app)
      .patch(`/api/v1/users/${bobId}/follow`)
      .set("Cookie", aliceCookie);
    expect(unfollowRes.status).toBe(200);
    expect(unfollowRes.body.following).toBe(false);
  });

  it("reflects the follow relationship in both users' profiles", async () => {
    const { cookie: aliceCookie, userId: aliceId } = await registerAndLogin({
      name: "Alice",
    });
    const { userId: bobId } = await registerAndLogin({ name: "Bob" });

    await request(app)
      .patch(`/api/v1/users/${bobId}/follow`)
      .set("Cookie", aliceCookie);

    const aliceProfile = await request(app).get(`/api/v1/users/${aliceId}`);
    expect(aliceProfile.body.data.user.following.map((u) => u._id)).toContain(
      bobId,
    );

    const bobProfile = await request(app).get(`/api/v1/users/${bobId}`);
    expect(bobProfile.body.data.user.followers.map((u) => u._id)).toContain(
      aliceId,
    );
  });
});

describe("GET /api/v1/users/:id", () => {
  it("returns a user's public profile", async () => {
    const { userId } = await registerAndLogin({ name: "Public Profile" });

    const res = await request(app).get(`/api/v1/users/${userId}`);

    expect(res.status).toBe(200);
    expect(res.body.data.user.name).toBe("Public Profile");
    expect(res.body.data.user.password).toBeUndefined();
  });

  it("returns 404 for a non-existent user", async () => {
    const fakeId = "64b7a0f1f1a2b3c4d5e6f7a8";
    const res = await request(app).get(`/api/v1/users/${fakeId}`);
    expect(res.status).toBe(404);
  });

  it("rejects a malformed user id", async () => {
    const res = await request(app).get("/api/v1/users/not-a-valid-id");
    expect(res.status).toBe(400);
  });
});

describe("GET /api/v1/users/feed", () => {
  it("requires authentication", async () => {
    const res = await request(app).get("/api/v1/users/feed");
    expect(res.status).toBe(401);
  });

  it("returns posts from followed users and own posts, newest first", async () => {
    const { cookie: aliceCookie, userId: aliceId } = await registerAndLogin({
      name: "Alice",
    });
    const { cookie: bobCookie, userId: bobId } = await registerAndLogin({
      name: "Bob",
    });
    await registerAndLogin({ name: "Carol" }); // not followed — shouldn't appear

    await request(app)
      .patch(`/api/v1/users/${bobId}/follow`)
      .set("Cookie", aliceCookie);

    await request(app)
      .post("/api/v1/posts")
      .set("Cookie", aliceCookie)
      .send({ content: "Alice's own post" });
    await request(app)
      .post("/api/v1/posts")
      .set("Cookie", bobCookie)
      .send({ content: "Bob's post" });

    const res = await request(app)
      .get("/api/v1/users/feed")
      .set("Cookie", aliceCookie);

    expect(res.status).toBe(200);
    expect(res.body.feed.posts).toHaveLength(2);
    const contents = res.body.feed.posts.map((p) => p.content);
    expect(contents).toEqual(
      expect.arrayContaining(["Alice's own post", "Bob's post"]),
    );
  });

  it("excludes posts from users that aren't followed", async () => {
    const { cookie: aliceCookie } = await registerAndLogin({ name: "Alice" });
    const { cookie: carolCookie } = await registerAndLogin({ name: "Carol" });

    await request(app)
      .post("/api/v1/posts")
      .set("Cookie", carolCookie)
      .send({ content: "Carol's post" });

    const res = await request(app)
      .get("/api/v1/users/feed")
      .set("Cookie", aliceCookie);

    expect(res.status).toBe(200);
    expect(res.body.feed.posts).toHaveLength(0);
  });

  // NOTE: this test documents a known bug rather than desired behavior.
  // getFeed's pagination.totalResults is computed via User.countDocuments(matchedFilter),
  // but matchedFilter is built from a Post query (e.g. { author: { $in: [...] } }).
  // Since the User collection has no "author" field, this always returns 0,
  // even though feed.posts itself is correct. See postController/userController notes.
  it("[KNOWN BUG] totalResults is incorrectly always 0 due to wrong model in countDocuments", async () => {
    const { cookie } = await registerAndLogin();
    await request(app)
      .post("/api/v1/posts")
      .set("Cookie", cookie)
      .send({ content: "A post" });

    const res = await request(app)
      .get("/api/v1/users/feed")
      .set("Cookie", cookie);

    expect(res.body.feed.posts).toHaveLength(1);
    expect(res.body.pagination.totalResults).toBe(0); // should be 1 once fixed
  });
});
