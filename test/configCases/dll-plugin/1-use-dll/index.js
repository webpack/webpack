var should = require("should");

it("should load a module from dll", function() {
	require("dll/a").should.be.eql("a");
});

it("should load an async module from dll", function() {
	require("dll/b")().then(function(c) {
		c.should.be.eql({ default: "c" });
	});
});
