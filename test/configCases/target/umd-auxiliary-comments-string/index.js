it("should run", function() {

});

it("should have auxiliary comment string", function() {
	var fs = require("fs");
	var source = fs.readFileSync(__filename, "utf-8");
	
	source.should.containEql("//test " + "comment");
});
