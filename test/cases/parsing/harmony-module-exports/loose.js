it("has an 'exports' free var", function() {
	(typeof exports).should.equal("object");
});

it("has a 'module' free var", function() {
	(typeof module).should.equal("object");
});
