import wrapped from "./wrapped";

it("should read a whole-namespace require(esm) from a wrapped body", () => {
	expect(wrapped.whole.NAME).toBe("esm");
	expect(wrapped.whole.default).toBe("default");
	expect(wrapped.whole.__esModule).toBe(true);
});

it("should read a member of a require() from a wrapped body", () => {
	expect(wrapped.member).toBe("cjs");
});

it("should pass an object module.exports through `new require()` in a wrapped body", () => {
	expect(wrapped.constructed).toEqual({ value: "object" });
});

it("should substitute a require() inside an async block of a wrapped body", async () => {
	await expect(wrapped.loadAsync()).resolves.toBe("async");
});

// The async target sits in its own chunk, so it stays outside — the reference
// to it resolves through the concatenation's external accessor.
it("should concatenate every require() target sharing the chunk", () => {
	const concatModules = __STATS__.modules.filter((m) => m.modules);
	expect(concatModules.length).toBe(1);
	expect(concatModules[0].modules.map((m) => m.name).sort()).toEqual([
		"./cjs-target.js",
		"./esm-target.js",
		"./index.js",
		"./object-target.js",
		"./wrapped.js"
	]);
});
