const a = require("./a");
const b = require("./b");

it("should work", () => {
	expect(a.default).toBe(42);
	expect(b.default).toBe(42);
});
