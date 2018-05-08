it("should support an empty context", function() {
	var c = require.context(".", true, /^nothing$/);
	expect(typeof c.id === "number" || typeof c.id === "string").toBeTruthy();
	expect(function() {
		c.resolve("");
	}).toThrowError();
	expect(function() {
		c("");
	}).toThrowError();
	expect(c.keys()).toEqual([]);
});
