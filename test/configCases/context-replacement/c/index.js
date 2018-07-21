it("should replace a context with a manual map", function() {
	function rqInContext(x) {
		return require(x);
	}
	rqInContext("a").should.be.eql("a");
	rqInContext("b").should.be.eql("b");
	rqInContext("./c").should.be.eql("b");
	rqInContext("d").should.be.eql("d");
	rqInContext("./d").should.be.eql("d");
	(function() {
		rqInContext("module-b")
	}.should.throw());
});
