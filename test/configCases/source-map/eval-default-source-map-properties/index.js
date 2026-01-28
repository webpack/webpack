it("should not include empty ignoreList in eval source map", () => {
	const fs = require("fs");
	const source = fs.readFileSync(__filename, "utf-8");

	const match = /sourceMappingURL\s*=\s*data:application\/json;charset=utf-8;base64,([A-Za-z0-9+\/=]+)/.exec(
		source
	);
	expect(match).not.toBeNull();
	const mapString = Buffer.from(match[1], "base64").toString("utf-8");

	expect(mapString).not.toMatch(/"ignoreList"\s*:\s*\[\s*\]/);

	// Verify default source map properties are present
	const sourceMap = JSON.parse(mapString);
	expect(sourceMap).toHaveProperty("version", 3);
	expect(sourceMap).toHaveProperty("sources");
	expect(Array.isArray(sourceMap.sources)).toBe(true);
	expect(sourceMap.sources.length).toBeGreaterThan(0);
});

