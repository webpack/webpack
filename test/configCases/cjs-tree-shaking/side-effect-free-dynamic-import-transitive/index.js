// The unused `ns` parameter makes the import reference no export at all, while
// the module is still loaded and evaluated. `lib.js` holds no self-reference, so
// shaking away what it reads fails at evaluation instead of at build time.
it("keeps exports that an evaluated side-effect-free cjs module reads", async () => {
	await import("./lib.js").then((ns) => {});
	expect(global.__cjsTransitiveValue).toBe(42);
	const src = String(__webpack_modules__["./dep.js"]);
	expect(src).toMatch(/exports\.obj = \{ value: 42 \};/);
	expect(src).toMatch(/__webpack_unused_export__ = 1;/);
	delete global.__cjsTransitiveValue;
});
