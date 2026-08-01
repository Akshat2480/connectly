// tests/unit/utils/apiFeatures.test.js
const APIFeatures = require("../../../utils/apiFeatures");

// Minimal fake mongoose query chain
const fakeQuery = () => {
  const q = {
    find: jest.fn(() => q),
    sort: jest.fn(() => q),
    select: jest.fn(() => q),
    skip: jest.fn(() => q),
    limit: jest.fn(() => q),
  };
  return q;
};

describe("APIFeatures", () => {
  it("defaults to sorting by -createdAt", () => {
    const q = fakeQuery();
    new APIFeatures(q, {}).sort();
    expect(q.sort).toHaveBeenCalledWith("-createdAt");
  });

  it("caps limit at 100 even if a higher value is requested", () => {
    const q = fakeQuery();
    const features = new APIFeatures(q, { limit: "500", page: "1" }).paginate();
    expect(features.limit).toBe(100);
    expect(q.limit).toHaveBeenCalledWith(100);
  });

  it("converts gte/gt/lte/lt to mongo operators", () => {
    const q = fakeQuery();
    new APIFeatures(q, { likesCount: { gte: "5" } }).filter();
    expect(q.find).toHaveBeenCalledWith({ likesCount: { $gte: "5" } });
  });
});