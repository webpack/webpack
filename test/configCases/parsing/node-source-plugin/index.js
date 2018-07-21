require("should");

it("should add node-libs-browser to target web by default", function() {
	process.browser.should.be.eql(true);
});
