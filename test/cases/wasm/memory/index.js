it("should allow direct memory connection between wasm modules", function() {
	return import("./run").then(function(module) {
		module.x1.should.be.eql(42);
		module.x2.should.be.eql(42);
		module.y1.should.be.eql(11);
		module.y2.should.be.eql(11);
	});
});
