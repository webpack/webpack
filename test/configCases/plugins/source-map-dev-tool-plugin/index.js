it("should contain publicPath prefix in [url] and resolve relatively to fileContext", function() {
	var fs = require("fs"),
			path = require("path");
	var source = fs.readFileSync(path.join(__dirname, "public/test.js"), "utf-8");
	source.should.containEql("//# sourceMappingURL=https://10.10.10.10/project/sourcemaps/test.js.map");
});

it("should write sourcemap file relative fo fileContext", function() {
	var fs = require("fs"),
			path = require("path");
	fs.existsSync(path.join(__dirname, "sourcemaps/test.js.map")).should.be.true();
});
