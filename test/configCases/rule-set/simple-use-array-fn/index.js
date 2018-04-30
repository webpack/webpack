it("should match only one rule in a oneOf block", function() {
	var ab = require("./ab");
	ab.should.be.eql([
		"ab",
		"?first"
	]);
});
it("should match with issuer and any option value", function() {
	var a = require("./a");
	var b = require("./b");
	a.should.be.eql([
		"a",
		"?third",
	]);
	b.should.be.eql([[
		"a",
		"second-3",
		"?second-2",
		"?second-1",
	]]);
});
