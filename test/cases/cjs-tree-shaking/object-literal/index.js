it("should tree-shake unused properties of module.exports = { … }", () => {
	const m = require("./lib");
	expect(m.used).toBe("used-value");
	expect(m.usedShort).toBe("used-short");
	expect(m.usedFn()).toBe("used-fn");
	expect(m.usedExports).toEqual([
		"used",
		"usedExports",
		"usedFn",
		"usedShort"
	]);
});
it("should keep side effects of unused data properties", () => {
	const m = require("./side-effects");
	expect(m.used).toBe("used");
	expect(m.getCount()).toBe(1);
});

it("should keep the full object when the namespace is used as a value", () => {
	const m = require("./lib-full");
	expect(m).toEqual({
		used: "used-value",
		unused: "unused-value"
	});
});

it("should keep sibling exports when an object method uses this", () => {
	const m = require("./method-this");
	expect(m.getValue()).toBe(10);
	expect(m.usedExports).toBe(true);
});

it("should drop unused data properties with a side-effect-free value", () => {
	const m = require("./pure");
	expect(m.used).toBe("used");
	expect(m.getCount()).toBe(0);
});
