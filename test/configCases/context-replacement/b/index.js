it("should replace a context with a new regExp", function() {
	function rqInContext(x) {
		return require(x);
	}
	rqInContext("./only-this").should.be.eql("ok");
});