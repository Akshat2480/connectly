// tests/unit/utils/AppError.test.js
const AppError = require("../../../utils/AppError");

describe("AppError", () => {
  it("sets status 'fail' for 4xx codes", () => {
    const err = new AppError("Bad request", 400);
    expect(err.status).toBe("fail");
    expect(err.isOperational).toBe(true);
  });

  it("sets status 'error' for 5xx codes", () => {
    const err = new AppError("Server error", 500);
    expect(err.status).toBe("error");
  });

  it("attaches structured errors when given", () => {
    const errors = [{ field: "email", message: "Invalid" }];
    const err = new AppError("Validation failed", 400, errors);
    expect(err.errors).toEqual(errors);
  });
});
