var fs = require("fs");
var path = require("path");

it("should correctly import a UMD external", function() {
	var external = require("external0");
	expect(external).toBe("module 0");
});

it("should contain `require()` statements for the UMD external", function() {
	var source = fs.readFileSync(path.join(__dirname, "bundle0.js"), "utf-8");
	expect(source).toMatch("require(\"external0\")");
});

it("should correctly import a non-UMD external", function() {
	var external = require("external1");
	expect(external).toBe("abc");
});

it("should not contain `require()` statements for the non-UMD external", function() {
	var source = fs.readFileSync(path.join(__dirname, "bundle0.js"), "utf-8");
	expect(source).not.toMatch("require(\"'abc'\")");
});
