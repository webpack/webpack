it("should not include sourcesContent if noSources option is used", function() {
	var fs = require("fs");
	var source = fs.readFileSync(__filename + ".map", "utf-8");
	var map = JSON.parse(source);
	expect(map).not.toHaveProperty('sourcesContent');
});

require.include("./test.js");
