it("should provide a module for a simple free var", function() {
	aaa.should.be.eql("aaa");
});

it("should provide a module for a nested var", function() {
	(bbb.ccc).should.be.eql("bbbccc");
	var x = bbb.ccc;
	x.should.be.eql("bbbccc");
});

it("should not provide a module for a part of a var", function() {
	(typeof bbb).should.be.eql("undefined");
});
