// Test for issue #15947 - ESM library with dynamic imports
it("should use new URL() for dynamic imports in ESM library output", () => {
	const fs = require("fs");
	const path = require("path");

	const outputPath = path.join(__dirname, "lib.js");
	const content = fs.readFileSync(outputPath, "utf-8");

	expect(content).toMatch(/new\s+URL/);
	expect(content).toMatch(/import\.meta\.url/);
	expect(content).not.toMatch(/import\s*\(\s*["']\.\/["']\s*\+/);

	// Verify that the chunk file was created
	const chunkFiles = fs
		.readdirSync(__dirname)
		.filter(f => f.startsWith("chunk.") && f.endsWith(".js"));
	expect(chunkFiles.length).toBeGreaterThan(0);

	// Verify the ESM export is present
	expect(content).toMatch(/export\s*\{/);
});
