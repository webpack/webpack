it("should handle the val loader (piped with css loader) correctly", function() {
	expect(
        (require("!css-loader!val-loader!../_css/generateCss") + "").indexOf("generated")
    ).not.toEqual(-1);
	expect(
        (require("!css-loader!val-loader!../_css/generateCss") + "").indexOf(".rule-import2")
    ).not.toEqual(-1);
	expect(
        (require("!raw-loader!val-loader!../_css/generateCss") + "").indexOf("generated")
    ).not.toEqual(-1);
});
