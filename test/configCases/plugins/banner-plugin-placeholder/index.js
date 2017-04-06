it("should interpolate file hash in bundle0 chunk", function() {
	var fs = require("fs");
	var source = fs
		.readFileSync(__filename, "utf-8")
		.split("\n")
		.slice(0,1)[0];

	source.should.not.containEql("hash");
});

require.include("./test.js");
