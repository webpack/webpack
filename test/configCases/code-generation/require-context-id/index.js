it("should escape require.context id correctly", function() {
	var context = require.context("./folder");
	expect(context("./a")).toBe("a");
	expect(context.id).toBeTypeOf("string");
});
