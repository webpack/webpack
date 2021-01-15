it("should include [id].js in SourceMap", function () {
	var fs = require("fs");
	var source = fs.readFileSync(__filename + ".map", "utf-8");
	var map = JSON.parse(source);
	expect(map.sources).toContain("webpack:///./[id].js");
});

if (Math.random() < 0) require("./[id].js");
