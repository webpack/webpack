it("should not include layer or type in absoluteResourcePath", function() {
	var fs = require("fs");
	var source = fs.readFileSync(__filename + ".map", "utf-8");
	var map = JSON.parse(source);
	expect(map.sources).toContain("webpack:///test.js");
});

if (Math.random() < 0) require("./test.js");
