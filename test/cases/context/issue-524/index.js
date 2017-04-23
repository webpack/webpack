it("should support an empty context", function() {
	var c = require.context(".", true, /^nothing$/);
	expect(['number', 'string']).toContain(typeof c.id);

	expect(function() {
		c.resolve("");
	}).toThrow();
	expect(function() {
		c("");
	}).toThrow();
	expect(c.keys()).toEqual([]);
});

// This would be a useful testcase, but it requires an (really) empty directory.
// **but** you cannot commit empty directories into git
/*it("should support an empty context (empty dir)", function() {
	var c = require.context("./empty", true, /^nothing$/);
	expect(typeof c.id).toBe("number");
	expect(function() {
		c.resolve("");
	}).toThrow();
	expect(function() {
		c("");
	}).toThrow();
	expect(c.keys()).toEqual([]);
});*/
