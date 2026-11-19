it("should hash a source map filename with the output hash options", function () {
	var fs = require("fs");
	var path = require("path");
	var crypto = require("crypto");
	var source = fs.readFileSync(__filename, "utf-8");
	var match = /sourceMappingURL\s*=\s*(\S+-([a-f0-9]{12})\.map)/.exec(source);
	expect(match).not.toBe(null);
	var map = fs.readFileSync(path.join(__dirname, match[1]), "utf-8");
	var expected = crypto
		.createHash("sha256")
		.update("salt")
		.update(map)
		.digest("hex")
		.slice(0, 12);
	expect(match[2]).toBe(expected);
});
