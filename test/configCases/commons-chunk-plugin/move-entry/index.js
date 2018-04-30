require("should");

it("should not be moved", function() {
	new Error().stack.should.not.match(/webpackBootstrap/);
});
