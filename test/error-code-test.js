const WebpackError = require("../../lib/errors/WebpackError");
const ModuleParseError = require("../../lib/errors/ModuleParseError");

describe("Webpack internal error codes", () => {
  it("should assign default code to WebpackError", () => {
    const err = new WebpackError("test");
    expect(err.code).toBe("WEBPACK_ERROR");
  });

  it("should assign code to ModuleParseError", () => {
    const err = new ModuleParseError(
      { resource: "test.js" },
      "",
      new Error("boom")
    );
    expect(err.code).toBe("WEBPACK_MODULE_PARSE_ERROR");
  });
});
