it("should run", function() {

});

it("should have auxiliary comments", function() {
	var fs = require("fs");
	var source = fs.readFileSync(__filename, "utf-8");

	source.should.containEql("//test " + "comment " + "commonjs");
	source.should.containEql("//test " + "comment " + "commonjs2");
	source.should.containEql("//test " + "comment " + "amd");
	source.should.containEql("//test " + "comment " + "root");
});
