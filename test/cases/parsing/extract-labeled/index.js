it("should parse and evaluate labeled modules", function() {
	var lbm = require("./labeledModuleA");
	lbm.should.have.property("x").be.eql("x");
	lbm.should.have.property("y").have.type("function");
	lbm.y().should.be.eql("y");
	lbm.should.have.property("z").be.eql("z");
	lbm.should.have.property("foo").have.type("function");
	lbm.foo().should.be.eql("foo");
});
