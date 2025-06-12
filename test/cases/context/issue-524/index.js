it("should support an empty context", function() {
	var c = require.context(".", true, /^nothing$/);
	expect(typeof c.id === "number" || typeof c.id === "string").toBeTruthy();
	expect(function() {
		c.resolve("");
	}).toThrow();
	expect(function() {
		c("");
	}).toThrow();
	expect(c.keys()).toEqual([]);
});
