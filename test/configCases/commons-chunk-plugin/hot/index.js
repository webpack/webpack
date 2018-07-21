require("should");

it("should have the correct main flag", function() {
	var a = require("./vendor");
	a._main.should.be.eql(false);
	module.hot._main.should.be.eql(true);
});

it("should be main", function() {
	require.main.should.be.eql(module);
});
