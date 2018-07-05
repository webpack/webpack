it("should handle the raw loader correctly", function() {
	expect(require("raw-loader!../_resources/abc.txt")).toBe("abc");
});
