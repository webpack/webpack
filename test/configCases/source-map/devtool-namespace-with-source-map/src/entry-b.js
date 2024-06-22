it("should include webpack://library-entry-b/./src/entry-b.js in SourceMap", function() {
	const fs = require("fs");
	const source = fs.readFileSync(__filename + ".map", "utf-8");
	const map = JSON.parse(source);
	expect(map.sources).toContain("webpack://library-entry-b/./src/entry-b.js");
});
