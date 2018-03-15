require("should");

it("should run", function() {
	var a = require("./a");
	a.should.be.eql("a");
});
