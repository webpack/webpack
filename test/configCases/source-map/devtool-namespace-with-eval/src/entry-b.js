it("should include webpack://library-entry-b/./src/entry-b.js in SourceMap", function() {
	const fs = require("fs");
	const source = fs.readFileSync(__filename, "utf-8");
	expect(source).toContain("sourceURL=webpack://library-entry-b/./src/entry-b.js");
});
