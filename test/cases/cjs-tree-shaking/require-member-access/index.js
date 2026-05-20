it("should tree-shake CommonJS exports through a const binding (call form)", () => {
	const m = require("./module");
	expect(m.a).toBe("a");
	expect(m.usedExports).toEqual(["a", "usedExports"]);
});

it("should tree-shake CommonJS exports through a const binding (property form)", () => {
	const m = require("./module");
	const a = m.a;
	const u = m.usedExports;
	expect(a).toBe("a");
	expect(u).toEqual(["a", "usedExports"]);
});

it("should tree-shake CommonJS exports through static string-literal access", () => {
	const m = require("./module");
	expect(m["a"]).toBe("a");
	expect(m.usedExports).toEqual(["a", "usedExports"]);
});

it("should bail out when the require result is read as a value", () => {
	const m = require("./module-rest");
	// Spreading the namespace forces every export to remain reachable.
	const all = { ...m };
	expect(all.a).toBe("a");
	expect(all.b).toBe("b");
	expect(all.usedExports).toBe(true);
});
