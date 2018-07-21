require("should");

it("should run", function() {
	var a = require("./a");
	a.should.be.eql("a");
});

it("should be main", function() {
	require.main.should.be.eql(module);
});