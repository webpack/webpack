it("should include webpack://library-entry-a/./src/entry-a.js in SourceMap", function() {
	var fs = require("fs");
	var source = fs.readFileSync(__filename + ".map", "utf-8");
	var map = JSON.parse(source);
	expect(map.sources).toContain("sourceURL=webpack://library-entry-a/./src/entry-a.js");
});
