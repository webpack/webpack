it("should not load node-libs-browser when node option is false", function() {
	expect((typeof process)).toBe("undefined");
});
