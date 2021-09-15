it("should handle the pug loader correctly", function() {
	expect(require("!pug-loader?self!../_resources/template.pug")({ abc: "abc" })).toBe("<p>selfabc</p><h1>included</h1>");
	expect(require("../_resources/template.pug")({ abc: "abc" })).toBe("<p>abc</p><h1>included</h1>");
});
