const path = require("path");

it("should not find old file", function() {
	var fs = require("fs");
	expect(() =>
		fs.readFileSync(path.join(__dirname, "file.js"), "utf-8")
	).toThrow();
});
