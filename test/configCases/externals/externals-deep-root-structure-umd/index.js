var fs = require("fs");
var path = require("path");

it("should correctly import a deep structure", function() {
	var external = require("ext-lib/alpha/beta/gamma");
	expect(external).toBe("module 2");
});

it("should contain deep root accessor statements for the UMD external", function() {
	var source = fs.readFileSync(path.join(__dirname, "bundle0.js"), "utf-8");
	expect(source).toMatch("factory(root[\"ext-lib\"].alpha.beta.gamma)");
});
