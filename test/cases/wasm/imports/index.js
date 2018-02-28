it("should allow to run a WebAssembly module with imports", function() {
	return import("./wasm.wasm?1").then(function(wasm) {
		const result = wasm.addNumber(3);
		result.should.be.eql(11);
	});
});
