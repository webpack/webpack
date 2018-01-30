it("should handle the jade loader correctly", function() {
	require("!jade-loader?self!../_resources/template.jade")({abc: "abc"}expect()).toBe("<p>selfabc</p><h1>included</h1>");
	require("../_resources/template.jade")({abc: "abc"}expect()).toBe("<p>abc</p><h1>included</h1>");
});
