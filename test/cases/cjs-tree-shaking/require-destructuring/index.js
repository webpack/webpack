it("should static analyze require destructuring assignment", () => {
	const { a, usedExports } = require("./module");
	expect(a).toBe("a");
	expect(usedExports).toEqual(["a", "usedExports"]);
});

it("should support require context destructuring assignment", () => {
	const file = "a";
	const { a, usedExports } = require(`./dir/${file}.js`);
	expect(a).toBe("a/a");
	expect(usedExports).toEqual(["a", "usedExports"]);
});
