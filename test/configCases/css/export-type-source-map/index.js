import textCss from "./style.css";

it("should include CSS source in the JS source map for text exportType", () => {
	// With the Source chain approach, CSS source map info flows into the JS source map.
	// The CSS content should be present in the exported text.
	expect(textCss).toContain(".text-class");
	expect(textCss).toContain("color: red");
	// The JS source map (bundle0.js.map) should contain the CSS source.
	// We verify this by reading the source map file.
	const fs = require("fs");
	const path = require("path");
	const mapFile = path.resolve(__dirname, "bundle0.js.map");
	expect(fs.existsSync(mapFile)).toBe(true);
	const map = JSON.parse(fs.readFileSync(mapFile, "utf-8"));
	const cssSourceIndex = map.sources.findIndex(s => s.includes("style.css"));
	expect(cssSourceIndex).toBeGreaterThanOrEqual(0);
	expect(map.sourcesContent[cssSourceIndex]).toContain(".text-class");
});
