it("should include webpack://mylibrary/./test.js in SourceMap", function() {
	var fs = require("fs");
	var source = fs.readFileSync(__filename + ".map", "utf-8");
	var map = JSON.parse(source);
	map.sources.should.containEql("webpack://mylibrary/./test.js");
});

require.include("./test.js");
