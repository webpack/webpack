it("should be able to process AST from loader", function() {
	require("./ast-loader!./module").should.be.eql("ok");
});
