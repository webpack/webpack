it("should not generate a JS file for CSS-only entry points without runtimeChunk", () => {
	const assets = __STATS__.assets.map(a => a.name);

	// CSS entry should produce a CSS file
	expect(assets).toContain("styles.css");

	// CSS entry should NOT produce a JS file
	expect(assets).not.toContain("styles.js");

	// JS entry should still produce a JS file
	expect(assets).toContain("main.js");
});
