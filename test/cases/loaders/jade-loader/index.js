it("should handle the jade loader correctly", function() {
	expect(require("!jade-loader?self!../_resources/template.jade")({ abc: "abc" })).toBe("<p>selfabc</p><h1>included</h1>");
	expect(require("../_resources/template.jade")({ abc: "abc" })).toBe("<p>abc</p><h1>included</h1>");
});
