it("should handle the jade loader correctly", function() {
	require("!jade?self!../_resources/template.jade")({abc: "abc"}).should.be.eql("<p>selfabc</p><h1>included</h1>");
	require("../_resources/template.jade")({abc: "abc"}).should.be.eql("<p>abc</p><h1>included</h1>");
});
