it("should name require in define correctly", function() {
	define(["require"], function(require) {
		expect((typeof require)).toBe("function");
	});
});
