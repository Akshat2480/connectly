// mocks uploadToCloudinary
jest.mock("../../utils/cloudinary", () => ({
  uploader: {
    upload_stream: jest.fn((options, callback) => {
      callback(null, {
        secure_url: "http://fake.url/image.jpg",
        public_id: "fake_id",
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
const Post = require("../../models/postModel");
const { connect, closeDatabase, clearDatabase } = require("../setup/testDb");
const { registerAndLogin } = require("../setup/authHelper");

beforeAll(async () => await connect());
afterEach(async () => {
  await clearDatabase();
  jest.clearAllMocks();
});
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
    expect(res.body.data.data.images).toEqual([]);
  });

  it("rejects empty content", async () => {
    const { cookie } = await registerAndLogin();

    const res = await request(app)
      .post("/api/v1/posts")
      .set("Cookie", cookie)
      .send({ content: "" });

    expect(res.status).toBe(400);
  });

  it("rejects content over 500 characters", async () => {
    const { cookie } = await registerAndLogin();

    const res = await request(app)
      .post("/api/v1/posts")
      .set("Cookie", cookie)
      .send({ content: "a".repeat(501) });

    expect(res.status).toBe(400);
  });

  it("uploads and attaches an image", async () => {
    const { cookie } = await registerAndLogin();

    const res = await request(app)
      .post("/api/v1/posts")
      .set("Cookie", cookie)
      .field("content", "Post with image")
      .attach("images", Buffer.from("fake-image-bytes"), "test.jpg");

    expect(res.status).toBe(201);
    expect(res.body.data.data.images).toHaveLength(1);
    expect(res.body.data.data.images[0].url).toBe("http://fake.url/image.jpg");
    expect(res.body.data.data.images[0].publicId).toBe("fake_id");
  });

  it("rejects non-image file uploads", async () => {
    const { cookie } = await registerAndLogin();

    const res = await request(app)
      .post("/api/v1/posts")
      .set("Cookie", cookie)
      .field("content", "Post with bad file")
      .attach("images", Buffer.from("not an image"), "test.txt");

    expect(res.status).toBe(400);
  });
});

describe("GET /api/v1/posts", () => {
  it("returns an empty list when there are no posts", async () => {
    const res = await request(app).get("/api/v1/posts");

    expect(res.status).toBe(200);
    expect(res.body.results).toBe(0);
    expect(res.body.data.data).toEqual([]);
  });

  it("returns posts sorted by newest first by default", async () => {
    const { cookie } = await registerAndLogin();

    await request(app)
      .post("/api/v1/posts")
      .set("Cookie", cookie)
      .send({ content: "First" });
    await request(app)
      .post("/api/v1/posts")
      .set("Cookie", cookie)
      .send({ content: "Second" });

    const res = await request(app).get("/api/v1/posts");

    expect(res.status).toBe(200);
    expect(res.body.results).toBe(2);
    expect(res.body.data.data[0].content).toBe("Second");
    expect(res.body.data.data[1].content).toBe("First");
  });

  it("respects pagination params", async () => {
    const { cookie } = await registerAndLogin();

    for (let i = 0; i < 5; i++) {
      await request(app)
        .post("/api/v1/posts")
        .set("Cookie", cookie)
        .send({ content: `Post ${i}` });
    }

    const res = await request(app).get("/api/v1/posts?limit=2&page=1");

    expect(res.status).toBe(200);
    expect(res.body.results).toBe(2);
    expect(res.body.pagination.totalResults).toBe(5);
    expect(res.body.pagination.totalPages).toBe(3);
  });
});

describe("GET /api/v1/posts/searchByContent", () => {
  it("requires authentication", async () => {
    const res = await request(app).get(
      "/api/v1/posts/searchByContent?content=hello",
    );
    expect(res.status).toBe(401);
  });

  it("requires a content query param", async () => {
    const { cookie } = await registerAndLogin();

    const res = await request(app)
      .get("/api/v1/posts/searchByContent")
      .set("Cookie", cookie);

    expect(res.status).toBe(400);
  });

  it("finds posts matching content, case-insensitively", async () => {
    const { cookie } = await registerAndLogin();

    await request(app)
      .post("/api/v1/posts")
      .set("Cookie", cookie)
      .send({ content: "Learning Jest is fun" });
    await request(app)
      .post("/api/v1/posts")
      .set("Cookie", cookie)
      .send({ content: "Unrelated post" });

    const res = await request(app)
      .get("/api/v1/posts/searchByContent?content=jest")
      .set("Cookie", cookie);

    expect(res.status).toBe(200);
    expect(res.body.results).toBe(1);
    expect(res.body.data.posts[0].content).toBe("Learning Jest is fun");
  });

  it("returns 400 when nothing matches", async () => {
    const { cookie } = await registerAndLogin();

    const res = await request(app)
      .get("/api/v1/posts/searchByContent?content=nonexistentterm")
      .set("Cookie", cookie);

    expect(res.status).toBe(400);
  });
});

describe("PATCH /api/v1/posts/:id/like", () => {
  it("requires authentication", async () => {
    const { cookie } = await registerAndLogin();
    const createRes = await request(app)
      .post("/api/v1/posts")
      .set("Cookie", cookie)
      .send({ content: "Like target" });
    const postId = createRes.body.data.data._id;

    const res = await request(app).patch(`/api/v1/posts/${postId}/like`);
    expect(res.status).toBe(401);
  });

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
    expect(likeRes.status).toBe(200);
    expect(likeRes.body.like).toBe(true);

    const post = await Post.findById(postId);
    expect(post.likesCount).toBe(1);

    const unlikeRes = await request(app)
      .patch(`/api/v1/posts/${postId}/like`)
      .set("Cookie", cookie);
    expect(unlikeRes.body.like).toBe(false);

    const postAfterUnlike = await Post.findById(postId);
    expect(postAfterUnlike.likesCount).toBe(0);
  });

  it("returns 404 for a non-existent post", async () => {
    const { cookie } = await registerAndLogin();
    const fakeId = "64b7a0f1f1a2b3c4d5e6f7a8"; // valid ObjectId shape, doesn't exist

    const res = await request(app)
      .patch(`/api/v1/posts/${fakeId}/like`)
      .set("Cookie", cookie);

    expect(res.status).toBe(404);
  });

  it("rejects a malformed post id", async () => {
    const { cookie } = await registerAndLogin();

    const res = await request(app)
      .patch("/api/v1/posts/not-a-valid-id/like")
      .set("Cookie", cookie);

    expect(res.status).toBe(400);
  });
});

describe("GET /api/v1/posts/:id", () => {
  it("returns a single post", async () => {
    const { cookie } = await registerAndLogin();
    const createRes = await request(app)
      .post("/api/v1/posts")
      .set("Cookie", cookie)
      .send({ content: "Find me" });
    const postId = createRes.body.data.data._id;

    const res = await request(app).get(`/api/v1/posts/${postId}`);

    expect(res.status).toBe(200);
    expect(res.body.data.data.content).toBe("Find me");
  });

  it("returns 404 for a non-existent post", async () => {
    const fakeId = "64b7a0f1f1a2b3c4d5e6f7a8";
    const res = await request(app).get(`/api/v1/posts/${fakeId}`);
    expect(res.status).toBe(404);
  });

  it("rejects a malformed post id", async () => {
    const res = await request(app).get("/api/v1/posts/not-a-valid-id");
    expect(res.status).toBe(400);
  });
});

describe("DELETE /api/v1/posts/:id", () => {
  it("requires authentication", async () => {
    const { cookie } = await registerAndLogin();
    const createRes = await request(app)
      .post("/api/v1/posts")
      .set("Cookie", cookie)
      .send({ content: "Delete target" });
    const postId = createRes.body.data.data._id;

    const res = await request(app).delete(`/api/v1/posts/${postId}`);
    expect(res.status).toBe(401);
  });

  it("rejects a non-owner trying to delete the post", async () => {
    const { cookie: ownerCookie } = await registerAndLogin({ name: "Owner" });
    const { cookie: otherCookie } = await registerAndLogin({
      name: "Intruder",
    });

    const createRes = await request(app)
      .post("/api/v1/posts")
      .set("Cookie", ownerCookie)
      .send({ content: "Owner's post" });
    const postId = createRes.body.data.data._id;

    const res = await request(app)
      .delete(`/api/v1/posts/${postId}`)
      .set("Cookie", otherCookie);

    expect(res.status).toBe(403);
    expect(res.body.message).toBe("You are not the author of this post");

    // confirm the post still exists
    const stillThere = await Post.findById(postId);
    expect(stillThere).not.toBeNull();
  });

  it("deletes a post owned by the requester", async () => {
    const { cookie } = await registerAndLogin();
    const createRes = await request(app)
      .post("/api/v1/posts")
      .set("Cookie", cookie)
      .send({ content: "Delete me" });
    const postId = createRes.body.data.data._id;

    const res = await request(app)
      .delete(`/api/v1/posts/${postId}`)
      .set("Cookie", cookie);

    expect(res.status).toBe(204);

    const deleted = await Post.findById(postId);
    expect(deleted).toBeNull();
  });
});

describe("PATCH /api/v1/posts/:id", () => {
  it("requires authentication", async () => {
    const { cookie } = await registerAndLogin();
    const createRes = await request(app)
      .post("/api/v1/posts")
      .set("Cookie", cookie)
      .send({ content: "Original content" });
    const postId = createRes.body.data.data._id;

    const res = await request(app)
      .patch(`/api/v1/posts/${postId}`)
      .send({ content: "Updated content" });

    expect(res.status).toBe(401);
  });

  it("updates the content of a post owned by the requester", async () => {
    const { cookie } = await registerAndLogin();
    const createRes = await request(app)
      .post("/api/v1/posts")
      .set("Cookie", cookie)
      .send({ content: "Original content" });
    const postId = createRes.body.data.data._id;

    const res = await request(app)
      .patch(`/api/v1/posts/${postId}`)
      .set("Cookie", cookie)
      .send({ content: "Updated content" });

    expect(res.status).toBe(200);
    expect(res.body.data.data.content).toBe("Updated content");

    const updated = await Post.findById(postId);
    expect(updated.content).toBe("Updated content");
  });

  it("rejects a non-owner trying to update the post", async () => {
    const { cookie: ownerCookie } = await registerAndLogin({ name: "Owner" });
    const { cookie: otherCookie } = await registerAndLogin({
      name: "Intruder",
    });

    const createRes = await request(app)
      .post("/api/v1/posts")
      .set("Cookie", ownerCookie)
      .send({ content: "Owner's post" });
    const postId = createRes.body.data.data._id;

    const res = await request(app)
      .patch(`/api/v1/posts/${postId}`)
      .set("Cookie", otherCookie)
      .send({ content: "Hijacked content" });

    expect(res.status).toBe(403);
    expect(res.body.message).toBe("You are not the author of this post");

    // confirm content was NOT changed
    const unchanged = await Post.findById(postId);
    expect(unchanged.content).toBe("Owner's post");
  });

  it("rejects empty content", async () => {
    const { cookie } = await registerAndLogin();
    const createRes = await request(app)
      .post("/api/v1/posts")
      .set("Cookie", cookie)
      .send({ content: "Original content" });
    const postId = createRes.body.data.data._id;

    const res = await request(app)
      .patch(`/api/v1/posts/${postId}`)
      .set("Cookie", cookie)
      .send({ content: "" });

    expect(res.status).toBe(400);

    const unchanged = await Post.findById(postId);
    expect(unchanged.content).toBe("Original content");
  });

  it("rejects content over 500 characters", async () => {
    const { cookie } = await registerAndLogin();
    const createRes = await request(app)
      .post("/api/v1/posts")
      .set("Cookie", cookie)
      .send({ content: "Original content" });
    const postId = createRes.body.data.data._id;

    const res = await request(app)
      .patch(`/api/v1/posts/${postId}`)
      .set("Cookie", cookie)
      .send({ content: "a".repeat(501) });

    expect(res.status).toBe(400);
  });

  it("allows a partial update with no content field (content is optional)", async () => {
    const { cookie } = await registerAndLogin();
    const createRes = await request(app)
      .post("/api/v1/posts")
      .set("Cookie", cookie)
      .send({ content: "Untouched content" });
    const postId = createRes.body.data.data._id;

    const res = await request(app)
      .patch(`/api/v1/posts/${postId}`)
      .set("Cookie", cookie)
      .send({});

    expect(res.status).toBe(200);
    expect(res.body.data.data.content).toBe("Untouched content");
  });

  it("returns 404 for a non-existent post", async () => {
    const { cookie } = await registerAndLogin();
    const fakeId = "64b7a0f1f1a2b3c4d5e6f7a8";

    const res = await request(app)
      .patch(`/api/v1/posts/${fakeId}`)
      .set("Cookie", cookie)
      .send({ content: "Doesn't matter" });

    expect(res.status).toBe(404);
  });

  it("rejects a malformed post id", async () => {
    const { cookie } = await registerAndLogin();

    const res = await request(app)
      .patch("/api/v1/posts/not-a-valid-id")
      .set("Cookie", cookie)
      .send({ content: "Doesn't matter" });

    expect(res.status).toBe(400);
  });

  it("ignores attempts to update fields other than content", async () => {
    const { cookie, userId } = await registerAndLogin();
    const createRes = await request(app)
      .post("/api/v1/posts")
      .set("Cookie", cookie)
      .send({ content: "Original content" });
    const postId = createRes.body.data.data._id;

    const res = await request(app)
      .patch(`/api/v1/posts/${postId}`)
      .set("Cookie", cookie)
      .send({
        content: "Updated content",
        author: "64b7a0f1f1a2b3c4d5e6f7a8",
        likes: ["64b7a0f1f1a2b3c4d5e6f7a8"],
      });

    expect(res.status).toBe(200);
    expect(res.body.data.data.author._id).toBe(userId);
    expect(res.body.data.data.likes).toEqual([]);
  });
});
