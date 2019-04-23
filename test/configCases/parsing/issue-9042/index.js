it("should not load __dirname when node option is false", function() {
	expect((typeof __dirname)).toBe("undefined");
});
