it("should support an empty context", function() {
	var c = require.context(".", true, /^nothing$/);
	c.id.should.be.type("number");
	(function() {
		c.resolve("");
	}).should.throw();
	(function() {
		c("");
	}).should.throw();
	c.keys().should.be.eql([]);
});