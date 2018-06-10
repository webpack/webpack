it("should handle the css loader correctly", function() {
	expect(
        (require("!css-loader!../_css/stylesheet.css") + "").indexOf(".rule-direct")
    ).not.toEqual(-1);
	expect(
        (require("!css-loader!../_css/stylesheet.css") + "").indexOf(".rule-import1")
    ).not.toEqual(-1);
	expect(
        (require("!css-loader!../_css/stylesheet.css") + "").indexOf(".rule-import2")
    ).not.toEqual(-1);
});
