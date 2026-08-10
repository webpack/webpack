// The unused `ns` parameter makes the import reference no export at all, while
// the module is still loaded and evaluated.
it("keeps self-referenced exports of a side-effect-free cjs module", async () => {
	await import("./lib.js").then((ns) => {});
	const src = String(__webpack_modules__["./lib.js"]);
	expect(src).toMatch(/exports\.a = 1;/);
	expect(src).toMatch(/__webpack_unused_export__ = exports\.a \+ 1;/);
});
