it("should set correct options on js files", function() {
	require("./loader!./index.js").should.be.eql({
		minimize: true,
		jsfile: true
	});
});
it("should set correct options on other files", function() {
	require("./loader!./txt.txt").should.be.eql({
		minimize: true
	});
});
