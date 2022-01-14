it("should not include layer or type in absoluteResourcePath", function () {
	var fs = require("fs");
	var path = require("path");
	var source = fs.readFileSync(__filename + ".map", "utf-8");
	var map = JSON.parse(source);
	expect(map.sources).toContain(
		path.resolve(
			__dirname,
			"../../../..//configCases/source-map/resource-path/test.js"
		)
	);
});

if (Math.random() < 0) require("./test.js");
