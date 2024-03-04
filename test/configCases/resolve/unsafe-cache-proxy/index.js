it("should resolve both alternatives", () => {
	const one = require("_/1");
	const two = require("_/2");
	expect(one).toBe(1);
	expect(two).toBe(2);
});
