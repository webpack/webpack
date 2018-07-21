it("should support an empty context", function() {
	var c = require.context(".", true, /^nothing$/);
	(typeof c.id).should.be.oneOf(["number", "string"]);
	(function() {
		c.resolve("");
	}).should.throw();
	(function() {
		c("");
	}).should.throw();
	c.keys().should.be.eql([]);
});

// This would be a useful testcase, but it requires an (really) empty directory.
// **but** you cannot commit empty directories into git
/*it("should support an empty context (empty dir)", function() {
	var c = require.context("./empty", true, /^nothing$/);
	c.id.should.be.type("number");
	(function() {
		c.resolve("");
	}).should.throw();
	(function() {
		c("");
	}).should.throw();
	c.keys().should.be.eql([]);
});*/
