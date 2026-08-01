const request = require("supertest");
const app = require("../../app");
const Comment = require("../../models/commentModel");
const { connect, closeDatabase, clearDatabase } = require("../setup/testDb");
const { registerAndLogin } = require("../setup/authHelper");

beforeAll(async () => await connect());
afterEach(async () => await clearDatabase());
afterAll(async () => await closeDatabase());

// Helper: create a post and return its id, scoped to this file only
const createPost = async (cookie, content = "A post to comment on") => {
  const res = await request(app)
    .post("/api/v1/posts")
    .set("Cookie", cookie)
    .send({ content });
  return res.body.data.data._id;
};

describe("POST /api/v1/posts/:postId/comments", () => {
  it("requires authentication", async () => {
    const { cookie } = await registerAndLogin();
    const postId = await createPost(cookie);

    const res = await request(app)
      .post(`/api/v1/posts/${postId}/comments`)
      .send({ text: "Nice post!" });

    expect(res.status).toBe(401);
  });

  it("returns 404 when the post doesn't exist", async () => {
    const { cookie } = await registerAndLogin();
    const fakeId = "64b7a0f1f1a2b3c4d5e6f7a8";

    const res = await request(app)
      .post(`/api/v1/posts/${fakeId}/comments`)
      .set("Cookie", cookie)
      .send({ text: "Nice post!" });

    expect(res.status).toBe(404);
  });

  it("creates a top-level comment", async () => {
    const { cookie } = await registerAndLogin();
    const postId = await createPost(cookie);

    const res = await request(app)
      .post(`/api/v1/posts/${postId}/comments`)
      .set("Cookie", cookie)
      .send({ text: "Great post!" });

    expect(res.status).toBe(201);
    expect(res.body.data.comment.text).toBe("Great post!");
    expect(res.body.data.comment.parentComment).toBeNull();
  });

  it("rejects empty comment text", async () => {
    const { cookie } = await registerAndLogin();
    const postId = await createPost(cookie);

    const res = await request(app)
      .post(`/api/v1/posts/${postId}/comments`)
      .set("Cookie", cookie)
      .send({ text: "" });

    expect(res.status).toBe(400);
  });

  it("rejects text over 300 characters", async () => {
    const { cookie } = await registerAndLogin();
    const postId = await createPost(cookie);

    const res = await request(app)
      .post(`/api/v1/posts/${postId}/comments`)
      .set("Cookie", cookie)
      .send({ text: "a".repeat(301) });

    expect(res.status).toBe(400);
  });

  it("creates a reply to a top-level comment", async () => {
    const { cookie } = await registerAndLogin();
    const postId = await createPost(cookie);

    const parentRes = await request(app)
      .post(`/api/v1/posts/${postId}/comments`)
      .set("Cookie", cookie)
      .send({ text: "Parent comment" });
    const parentId = parentRes.body.data.comment._id;

    const replyRes = await request(app)
      .post(`/api/v1/posts/${postId}/comments`)
      .set("Cookie", cookie)
      .send({ text: "A reply", parentComment: parentId });

    expect(replyRes.status).toBe(201);
    expect(replyRes.body.data.comment.parentComment).toBe(parentId);
  });

  it("rejects replying to a reply (no nested replies)", async () => {
    const { cookie } = await registerAndLogin();
    const postId = await createPost(cookie);

    const parentRes = await request(app)
      .post(`/api/v1/posts/${postId}/comments`)
      .set("Cookie", cookie)
      .send({ text: "Parent comment" });
    const parentId = parentRes.body.data.comment._id;

    const replyRes = await request(app)
      .post(`/api/v1/posts/${postId}/comments`)
      .set("Cookie", cookie)
      .send({ text: "A reply", parentComment: parentId });
    const replyId = replyRes.body.data.comment._id;

    const nestedReplyRes = await request(app)
      .post(`/api/v1/posts/${postId}/comments`)
      .set("Cookie", cookie)
      .send({ text: "Reply to a reply", parentComment: replyId });

    expect(nestedReplyRes.status).toBe(400);
    expect(nestedReplyRes.body.message).toBe(
      "You cannot reply to another reply",
    );
  });

  it("rejects a parentComment that belongs to a different post", async () => {
    const { cookie } = await registerAndLogin();
    const postAId = await createPost(cookie, "Post A");
    const postBId = await createPost(cookie, "Post B");

    const commentOnA = await request(app)
      .post(`/api/v1/posts/${postAId}/comments`)
      .set("Cookie", cookie)
      .send({ text: "Comment on A" });
    const commentOnAId = commentOnA.body.data.comment._id;

    const res = await request(app)
      .post(`/api/v1/posts/${postBId}/comments`)
      .set("Cookie", cookie)
      .send({
        text: "Trying to reply cross-post",
        parentComment: commentOnAId,
      });

    expect(res.status).toBe(400);
    expect(res.body.message).toBe(
      "Parent comment doesnot belong to the same post",
    );
  });

  it("returns 404 when parentComment id doesn't exist", async () => {
    const { cookie } = await registerAndLogin();
    const postId = await createPost(cookie);
    const fakeId = "64b7a0f1f1a2b3c4d5e6f7a8";

    const res = await request(app)
      .post(`/api/v1/posts/${postId}/comments`)
      .set("Cookie", cookie)
      .send({ text: "Reply to nowhere", parentComment: fakeId });

    expect(res.status).toBe(404);
  });

  it("rejects a malformed parentComment id", async () => {
    const { cookie } = await registerAndLogin();
    const postId = await createPost(cookie);

    const res = await request(app)
      .post(`/api/v1/posts/${postId}/comments`)
      .set("Cookie", cookie)
      .send({ text: "Bad parent id", parentComment: "not-a-valid-id" });

    expect(res.status).toBe(400);
  });
});

describe("GET /api/v1/posts/:postId/comments", () => {
  it("does not require authentication", async () => {
    const { cookie } = await registerAndLogin();
    const postId = await createPost(cookie);
    await request(app)
      .post(`/api/v1/posts/${postId}/comments`)
      .set("Cookie", cookie)
      .send({ text: "Public comment" });

    const res = await request(app).get(`/api/v1/posts/${postId}/comments`);

    expect(res.status).toBe(200);
    expect(res.body.results).toBe(1);
  });

  it("only returns comments belonging to the given post", async () => {
    const { cookie } = await registerAndLogin();
    const postAId = await createPost(cookie, "Post A");
    const postBId = await createPost(cookie, "Post B");

    await request(app)
      .post(`/api/v1/posts/${postAId}/comments`)
      .set("Cookie", cookie)
      .send({ text: "On A" });
    await request(app)
      .post(`/api/v1/posts/${postBId}/comments`)
      .set("Cookie", cookie)
      .send({ text: "On B" });

    const res = await request(app).get(`/api/v1/posts/${postAId}/comments`);

    expect(res.status).toBe(200);
    expect(res.body.results).toBe(1);
    expect(res.body.data.data[0].text).toBe("On A");
  });
});

describe("GET /api/v1/posts/:postId/comments/:id", () => {
  it("returns a single comment", async () => {
    const { cookie } = await registerAndLogin();
    const postId = await createPost(cookie);
    const createRes = await request(app)
      .post(`/api/v1/posts/${postId}/comments`)
      .set("Cookie", cookie)
      .send({ text: "Findable comment" });
    const commentId = createRes.body.data.comment._id;

    const res = await request(app).get(
      `/api/v1/posts/${postId}/comments/${commentId}`,
    );

    expect(res.status).toBe(200);
    expect(res.body.data.data.text).toBe("Findable comment");
  });

  it("returns 404 for a non-existent comment", async () => {
    const { cookie } = await registerAndLogin();
    const postId = await createPost(cookie);
    const fakeId = "64b7a0f1f1a2b3c4d5e6f7a8";

    const res = await request(app).get(
      `/api/v1/posts/${postId}/comments/${fakeId}`,
    );
    expect(res.status).toBe(404);
  });

  it("rejects a malformed comment id", async () => {
    const { cookie } = await registerAndLogin();
    const postId = await createPost(cookie);

    const res = await request(app).get(
      `/api/v1/posts/${postId}/comments/not-a-valid-id`,
    );
    expect(res.status).toBe(400);
  });
});

describe("DELETE /api/v1/posts/:postId/comments/:id", () => {
  it("requires authentication", async () => {
    const { cookie } = await registerAndLogin();
    const postId = await createPost(cookie);
    const createRes = await request(app)
      .post(`/api/v1/posts/${postId}/comments`)
      .set("Cookie", cookie)
      .send({ text: "Delete target" });
    const commentId = createRes.body.data.comment._id;

    const res = await request(app).delete(
      `/api/v1/posts/${postId}/comments/${commentId}`,
    );
    expect(res.status).toBe(401);
  });

  it("deletes a comment owned by the requester", async () => {
    const { cookie } = await registerAndLogin();
    const postId = await createPost(cookie);
    const createRes = await request(app)
      .post(`/api/v1/posts/${postId}/comments`)
      .set("Cookie", cookie)
      .send({ text: "Delete me" });
    const commentId = createRes.body.data.comment._id;

    const res = await request(app)
      .delete(`/api/v1/posts/${postId}/comments/${commentId}`)
      .set("Cookie", cookie);

    expect(res.status).toBe(204);

    const deleted = await Comment.findById(commentId);
    expect(deleted).toBeNull();
  });

  it("returns 404 when deleting a comment that doesn't exist", async () => {
    const { cookie } = await registerAndLogin();
    const postId = await createPost(cookie);
    const fakeId = "64b7a0f1f1a2b3c4d5e6f7a8";

    const res = await request(app)
      .delete(`/api/v1/posts/${postId}/comments/${fakeId}`)
      .set("Cookie", cookie);

    expect(res.status).toBe(404);
  });

  it("rejects a malformed comment id", async () => {
    const { cookie } = await registerAndLogin();
    const postId = await createPost(cookie);

    const res = await request(app)
      .delete(`/api/v1/posts/${postId}/comments/not-a-valid-id`)
      .set("Cookie", cookie);

    expect(res.status).toBe(400);
  });

  it("cascades deletion to replies when a parent comment is deleted", async () => {
    const { cookie } = await registerAndLogin();
    const postId = await createPost(cookie);

    const parentRes = await request(app)
      .post(`/api/v1/posts/${postId}/comments`)
      .set("Cookie", cookie)
      .send({ text: "Parent" });
    const parentId = parentRes.body.data.comment._id;

    const replyRes = await request(app)
      .post(`/api/v1/posts/${postId}/comments`)
      .set("Cookie", cookie)
      .send({ text: "Reply", parentComment: parentId });
    const replyId = replyRes.body.data.comment._id;

    await request(app)
      .delete(`/api/v1/posts/${postId}/comments/${parentId}`)
      .set("Cookie", cookie);

    const orphanedReply = await Comment.findById(replyId);
    expect(orphanedReply).toBeNull();
  });
});
