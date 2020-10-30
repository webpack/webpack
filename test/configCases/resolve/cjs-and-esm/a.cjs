const b = require("./b.mjs");

it("should resolve both alternatives", () => {
	expect(b.foo).toMatch("bar");
});
