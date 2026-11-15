const value = require("./value");

it("merges dependencies and cacheable from the main loader context", () => {
	expect(value).toBe(1);
});
