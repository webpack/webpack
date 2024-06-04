it("should write asset file to output directory", function() {
	var fs = require("fs"),
			path = require("path");
	var source = fs.readFileSync(path.join(__dirname, "asset.css"), "utf-8");
	expect(source).toMatch("/*# sourceMappingURL=asset.css.map*/");
});

it("should write sourcemap file relative to fileContext", function() {
	var fs = require("fs"),
			path = require("path");
	expect(fs.existsSync(path.join(__dirname, "asset.css.map"))).toBe(true);
});
