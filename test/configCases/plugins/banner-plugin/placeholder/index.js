it("should interpolate filename hash into banner", function() {
	var fs = require("fs"),
		path = require("path");
	var source = fs.readFileSync(__filename, "utf-8");
	source.should.not.containEql("hash");
});

require.include("./test.js");
