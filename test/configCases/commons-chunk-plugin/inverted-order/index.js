require("should");

var a = require("./a");

it("should run", function() {
	a.should.be.eql("a");
});

var mainModule = require.main;

it("should be main", function() {
	mainModule.should.be.eql(module);
});
