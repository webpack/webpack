it("should resolve both alternatives", () => {
	const one = require("./b");
	const two = require("./b/2");
	expect(one).toBe(1);
	expect(two).toBe(2);
});
