it("should handle the coffee loader correctly", function() {
	expect(require("!coffee-loader!../_resources/script.coffee")).toBe("coffee test");
	expect(require("../_resources/script.coffee")).toBe("coffee test");
});

it("should handle literate coffee script correctly", function() {
	expect(require("!coffee-loader?literate!./script.coffee.md")).toBe("literate coffee test");
});

it("should generate valid code with cheap-source-map", function() {
	require("!coffee-loader!./module-only.coffee");
});
