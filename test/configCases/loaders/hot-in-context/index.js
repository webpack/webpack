it("should have hmr flag in loader context", function() {
	require("./loader!").should.be.eql(!!module.hot);
});
