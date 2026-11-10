it("should resolve externals from a function in the deprecated (context, request, callback) form", function () {
	expect(require("external")).toBe(42);
});
