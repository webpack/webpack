it("should match rule with multiple loaders in 'loader'", function() {
	var abc = require("./abc");
	abc.should.be.eql([
		"abc",
		"?b",
		"?a"
	]);
});
it("should match rule with multiple loaders in 'loaders'", function() {
	var def = require("./def");
	def.should.be.eql([
		"def",
		"?d",
		"?c"
	]);
});
