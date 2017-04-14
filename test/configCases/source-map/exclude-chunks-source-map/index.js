it("should include test.js in SourceMap for bundle0 chunk", function() {
	var fs = require("fs");
	var source = fs.readFileSync(__filename + ".map", "utf-8");
	var map = JSON.parse(source);
	map.sources.should.containEql("webpack:///./test.js");
});

it("should not produce a SourceMap for vendors chunk", function() {
	var fs = require("fs"),
			path = require("path"),
			assert = require("assert");
	fs.existsSync(path.join(__dirname, "vendors.js.map")).should.be.false();
});

require.include("./test.js");
