require("should");

it("should not load node-libs-browser when node option is false", function() {
	(typeof process).should.be.eql("undefined");
});
