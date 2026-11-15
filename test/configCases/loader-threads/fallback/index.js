const value = require("./value");

it("falls back to the main thread when loader options cannot be cloned", () => {
	expect(value).toBe("main:1");
});
