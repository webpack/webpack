it("should allow to run a WebAssembly module", function(done) {
	import("./module").then(function(module) {
		const result = module.run();
		result.should.be.eql(42);
		done();
	});
});
