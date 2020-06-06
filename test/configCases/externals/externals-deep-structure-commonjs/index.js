var fs = require("fs");
var path = require("path");

it("should correctly import a deep structure", function() {
	var external = require("ext-lib/alpha/beta/gamma");
	expect(external).toBe("module 2");
});

it("should contain simple require statements for the commonjs external", function() {
	var source = fs.readFileSync(path.join(__dirname, "bundle0.js"), "utf-8");
	expect(source).toMatch("require(\"ext-lib/alpha/beta/gamma\")");
});
