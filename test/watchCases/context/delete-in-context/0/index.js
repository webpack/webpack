it("should detect changes in a context", function() {
	var context = require.context("./directory");
	expect(context.keys().length).toBe((+WATCH_STEP) % 3 * 2);
});
