var fs = require("fs");
var path = require("path");

var dependencyArrayRegex = /define\((\[[^\]]*\]), (function)?\(/;
var source = fs.readFileSync(path.join(__dirname, "bundle0.js"), "utf-8");
var [, deps] = dependencyArrayRegex.exec(source);

it("should correctly import a AMD external", function() {
	var external = require("external0");
	expect(external).toBe("module 0");
});

it("should contain the AMD external in the dependency array", function() {
	expect(deps).toContain("\"external0\"");
});

it("should correctly import a non-AMD external", function() {
	var external = require("external1");
	expect(external).toBe("abc");
});

it("should not contain the non-AMD external in the dependency array", function() {
	expect(deps).not.toContain("\"external1\"");
});

it("should correctly import a asset external", function() {
	var asset = new URL("#hash", import.meta.url);
	expect(asset.href).toBe(__webpack_base_uri__ + "#hash");
});

it("should not contain asset external in the dependency array", function() {
	expect(deps).not.toContain("\"#hash\"");
});
