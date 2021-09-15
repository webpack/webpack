it("should not load node bindings when node option is false", function() {
	expect((typeof global)).toBe("undefined");
});
