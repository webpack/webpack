it("should not include empty ignoreList in source map", () => {
	const fs = require("fs");
	const path = require("path");
	const sourceMapPath = path.join(__dirname, "bundle0.js.map");
	const sourceMapContent = fs.readFileSync(sourceMapPath, "utf-8");

	expect(sourceMapContent).not.toMatch(/"ignoreList"\s*:\s*\[\s*\]/);

	// Verify default source map properties are present
	const sourceMap = JSON.parse(sourceMapContent);
	expect(sourceMap).toHaveProperty("version", 3);
	expect(sourceMap).toHaveProperty("sources");
	expect(Array.isArray(sourceMap.sources)).toBe(true);
	expect(sourceMap.sources.length).toBeGreaterThan(0);
});

