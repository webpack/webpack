it("should contain banner in bundle0 chunk", function() {
	var fs = require("fs");
	var source = fs.readFileSync(__filename, "utf-8");
	source.should.containEql("A test value");
});

it("should not contain banner in vendors chunk", function() {
	var fs = require("fs"),
		path = require("path");
	var source = fs.readFileSync(path.join(__dirname, "vendors.js"), "utf-8");
	source.should.not.containEql("A test value");
});

require.include("./test.js");
