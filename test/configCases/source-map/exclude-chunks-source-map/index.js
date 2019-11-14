it("should include test.js in SourceMap for bundle0 chunk", function() {
	var fs = require("fs");
	var source = fs.readFileSync(__filename + ".map", "utf-8");
	var map = JSON.parse(source);
	expect(map.sources).toContain("webpack:///./test.js");
});

it("should not produce a SourceMap for vendors chunk", function() {
	var fs = require("fs"),
		path = require("path"),
		assert = require("assert");
	expect(fs.existsSync(path.join(__dirname, "vendors.js.map"))).toBe(false);
});

if (Math.random() < 0) require("./test.js");
