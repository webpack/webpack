const b = require("./b.mjs");

it("should load mjs from cjs", () => {
	expect(b.foo).toMatch("bar");
});
