it("should include webpack://mynamespace/./test.js in SourceMap", function() {
	var fs = require("fs");
	var source = fs.readFileSync(__filename + ".map", "utf-8");
	var map = JSON.parse(source);
	map.sources.should.containEql("webpack://mynamespace/./test.js");
});

require.include("./test.js");
