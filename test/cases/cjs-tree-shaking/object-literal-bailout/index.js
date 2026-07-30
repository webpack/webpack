it("should bailout on spread in module.exports object literal", () => {
	const m = require("./spread");
	expect(m.used).toBe("used");
	expect(m.extra).toBe("extra");
	// Bailout clears structured exports, so usage is unknown.
	expect(m.usedExports).toBe(null);
});

it("should bailout on computed keys in module.exports object literal", () => {
	const m = require("./computed");
	expect(m.used).toBe("used");
	expect(m.dynamic).toBe("dynamic");
	expect(m.usedExports).toBe(null);
});

it("should bailout on indirect module.exports = object", () => {
	const m = require("./indirect");
	expect(m.used).toBe("used");
	expect(m.unused).toBe("unused");
	expect(m.usedExports).toBe(null);
});

it("should bailout on __proto__ in module.exports object literal", () => {
	const m = require("./proto");
	expect(m.used).toBe("used");
	expect(Object.getPrototypeOf(m)).toBe(null);
	expect(m.usedExports).toBe(null);
});
