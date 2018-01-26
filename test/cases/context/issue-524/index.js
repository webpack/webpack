it("should support an empty context", function() {
	var c = require.context(".", true, /^nothing$/);
	expect(typeof c.id).to.be.oneOf(["number", "string"]);
	expect(function() {
		c.resolve("");
	}).toThrowError();
	expect(function() {
		c("");
	}).toThrowError();
	expect(c.keys()).toEqual([]);
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
	expect(c.keys()).toEqual([]);
});*/
