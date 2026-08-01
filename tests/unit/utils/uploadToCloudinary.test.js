// tests/unit/utils/uploadToCloudinary.test.js
jest.mock("../../../utils/cloudinary", () => ({
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

const uploadToCloudinary = require("../../../utils/uploadToCloudinary");

describe("uploadToCloudinary", () => {
  it("resolves with the cloudinary result", async () => {
    const result = await uploadToCloudinary(
      Buffer.from("fake"),
      "connectly/posts",
    );
    expect(result.secure_url).toBe("http://fake.url/image.jpg");
  });
});
