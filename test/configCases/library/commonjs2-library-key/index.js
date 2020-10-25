it("should not have library key in source when libraryTarget eq commonjs2", function() {
	var fs = require("fs");
	var path = require("path");
	var source = fs.readFileSync(path.join(__dirname, "bundle0.js"), "utf-8");

	expect(source).not.toMatch("module.exports[\"lib-name\"]");
	expect(source).toMatch(
		"module.exports =\n/******/ (() => { // webpackBootstrap"
	);
});
