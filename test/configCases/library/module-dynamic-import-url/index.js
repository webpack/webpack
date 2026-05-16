// Test for issue #15947 - ESM library with dynamic imports
it("should generate statically analyzable dynamic imports for ESM library output", () => {
	const fs = require("fs");
	const path = require("path");

	const outputPath = path.join(__dirname, "lib.js");
	const content = fs.readFileSync(outputPath, "utf-8");

	// Should use new URL with import.meta.url and literal path
	expect(content).toMatch(/import\(\s*new\s+URL\(\s*"[^"]+"\s*,\s*import\.meta\.url\s*\)\.href\s*\)/);
	// Should not use dynamic __webpack_require__.u() or publicPath string concatenation
	expect(content).not.toMatch(/__webpack_require__\.u\(/);
	expect(content).not.toMatch(/\+\s*__webpack_require__\.p\s*\+/);

	// Verify that the chunk file was created
	const chunkFiles = fs
		.readdirSync(__dirname)
		.filter(f => f.startsWith("chunk.") && f.endsWith(".js"));
	expect(chunkFiles.length).toBeGreaterThan(0);

	// Verify the ESM export is present
	expect(content).toMatch(/export\s*\{/);
});
