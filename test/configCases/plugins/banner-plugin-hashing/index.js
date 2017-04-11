it("should interpolate file hash in bundle0 chunk", function(done) {
	var fs = require("fs");
	var source = fs
		.readFileSync(__filename, "utf-8")
		.split("\n")
		.slice(0,1)[0];

	//debugger
	source.should.not.containEql("hash");
	done()
});

require.include("./test.js");
