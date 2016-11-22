it("should match rule with resource query", function() {
	var a1 = require("./a");
	a1.should.be.eql([
		"a"
	]);
	var a2 = require("./a?loader");
	a2.should.be.eql([
		"a",
		"?query"
	]);
	var a3 = require("./a?other");
	a3.should.be.eql([
		"a"
	]);
});
