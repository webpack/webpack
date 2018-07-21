require("should");
var fs = require("fs");
var path = require("path");

it("should correctly import a UMD external", function() {
	var external = require("external0");
	external.should.be.eql("module 0");
});

it("should contain `require()` statements for the UMD external", function() {
	var source = fs.readFileSync(path.join(__dirname, "bundle0.js"), "utf-8");
	source.should.containEql("require(\"external0\")");
});

it("should correctly import a non-UMD external", function() {
	var external = require("external1");
	external.should.be.eql("abc");
});

it("should not contain `require()` statements for the non-UMD external", function() {
	var source = fs.readFileSync(path.join(__dirname, "bundle0.js"), "utf-8");
	source.should.not.containEql("require(\"'abc'\")");
});
