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

it("should static analyze aliased require destructuring", () => {
	const { a: renamedA, usedExports } = require("./module");
	expect(renamedA).toBe("a");
	expect(usedExports).toEqual(["a", "usedExports"]);
});

it("should support require context aliased destructuring assignment", () => {
	const file = "a";
	const { a: renamedA, usedExports } = require(`./dir/${file}.js`);
	expect(renamedA).toBe("a/a");
	expect(usedExports).toEqual(["a", "usedExports"]);
});

it("should static analyze require destructuring with default values", () => {
	const { a = "fallback", usedExports } = require("./module");
	expect(a).toBe("a");
	expect(usedExports).toEqual(["a", "usedExports"]);
});

it("should bail on rest element in require destructuring", () => {
	const { usedExports, ...rest } = require("./module-rest");
	expect(usedExports).toBe(true);
	expect(rest).toEqual({ a: "a", b: "b" });
});
