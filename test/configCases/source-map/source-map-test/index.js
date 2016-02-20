it("should include test.js in SourceMap", function() {
	var fs = require("fs");
	var source = fs.readFileSync(__filename + ".map", "utf-8");
	var map = JSON.parse(source);
	map.sources.should.containEql("webpack:///./test.js");
	map.sources.should.containEql("webpack:///./test-jsx.jsx");
});

require.include("./test.js");
require.include("./test-jsx.jsx");
