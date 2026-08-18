const path = require("path");

it("should report an unused entry of an externals array", () => {
	expect(typeof path.join).toBe("function");
});
