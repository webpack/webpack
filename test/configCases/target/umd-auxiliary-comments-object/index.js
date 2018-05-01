it("should run", function() {

});

it("should have auxiliary comments", function() {
	var fs = require("fs");
	var source = fs.readFileSync(__filename, "utf-8");

	expect(source).toMatch("//test " + "comment " + "commonjs");
	expect(source).toMatch("//test " + "comment " + "commonjs2");
	expect(source).toMatch("//test " + "comment " + "amd");
	expect(source).toMatch("//test " + "comment " + "root");
});
