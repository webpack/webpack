it("should parse multiple expressions in a require", function(done) {
	var name = "abc";
	require(["./" + name + "/" + name + "Test"], function(x) {
		x.should.be.eql("ok");
		done();
	});
});