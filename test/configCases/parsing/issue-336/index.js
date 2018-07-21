it("should provide a module to a free var in a var decl", function() {
	var x = aaa.test;
	x.should.be.eql("test");
});