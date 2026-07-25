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

it("should static analyze destructuring of a require binding", () => {
	const m = require("./module-binding");
	const { a, usedExports } = m;
	expect(a).toBe("a");
	expect(usedExports).toEqual(["a", "usedExports"]);
});

it("should static analyze aliased destructuring of a require binding", () => {
	const m = require("./module-binding");
	const { a: renamedA, usedExports } = m;
	expect(renamedA).toBe("a");
	expect(usedExports).toEqual(["a", "usedExports"]);
});

it("should collect every destructuring of the same require binding", () => {
	const m = require("./module-binding-multi");
	const { a } = m;
	const { b, usedExports } = m;
	expect(a).toBe("a");
	expect(b).toBe("b");
	expect(usedExports).toEqual(["a", "b", "usedExports"]);
});

it("should combine destructuring and member access on a require binding", () => {
	const m = require("./module-binding-mixed");
	const { a } = m;
	expect(a).toBe("a");
	expect(m.b).toBe("b");
	expect(m.usedExports).toEqual(["a", "b", "usedExports"]);
});

it("should bail on rest element when destructuring a require binding", () => {
	const m = require("./module-binding-rest");
	const { usedExports, ...rest } = m;
	expect(usedExports).toBe(true);
	expect(rest).toEqual({ a: "a", b: "b" });
});

it("should bail on rest element in require destructuring", () => {
	const { usedExports, ...rest } = require("./module-rest");
	expect(usedExports).toBe(true);
	expect(rest).toEqual({ a: "a", b: "b" });
});
