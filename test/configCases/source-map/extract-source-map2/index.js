const fs = require("fs");
const path = require("path");

require("./a");

it("should extract source map", () => {
	const fileData = fs.readFileSync(path.resolve(__dirname, "bundle0.js.map")).toString("utf-8");
	const { sources, sourcesContent } = JSON.parse(fileData);
	expect(sources.includes("webpack:///./external-source-map.txt")).toBe(true);
	expect(sourcesContent.map(s => s.trim())).toContain("source");
});
