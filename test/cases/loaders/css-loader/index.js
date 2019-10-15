it("should handle the css loader correctly", function() {
	expect(require("!css-loader!../_css/stylesheet.css") + "").toContain(
		".rule-direct"
	);
	expect(require("!css-loader!../_css/stylesheet.css") + "").toContain(
		".rule-import1"
	);
	expect(require("!css-loader!../_css/stylesheet.css") + "").toContain(
		".rule-import2"
	);
});
