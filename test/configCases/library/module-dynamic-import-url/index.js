// Test for issue #15947 - ESM library with dynamic imports
it("should use new URL() for dynamic imports in ESM library output", () => {
	// This test verifies that dynamic imports in ESM library output
	// use new URL() with import.meta.url for proper path resolution
	// in nested bundling scenarios

	const fs = require("fs");
	const path = require("path");

	// Read the generated library output file (lib.js)
	const outputPath = path.join(__dirname, "lib.js");
	const content = fs.readFileSync(outputPath, "utf-8");

	// The correct implementation should use: import(new URL('./chunk.xxx.js', import.meta.url))
	// instead of: import("./" + __webpack_require__.u(chunkId))

	// This test should FAIL until issue #15947 is fixed
	// Check that webpack uses new URL() for dynamic imports (expected behavior)
	expect(content).toMatch(/new\s+URL\s*\([^)]*import\.meta\.url/); // Should use new URL
	expect(content).not.toMatch(/import\s*\(\s*["']\.\/["']\s*\+/); // Should NOT use string concatenation

	// Verify that the chunk file was created
	const chunkFiles = fs
		.readdirSync(__dirname)
		.filter(f => f.startsWith("chunk.") && f.endsWith(".js"));
	expect(chunkFiles.length).toBeGreaterThan(0);

	// Verify the ESM export is present
	expect(content).toMatch(/export\s*\{/);
});
