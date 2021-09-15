it("should allow to run a WebAssembly module with imports", function() {
	return import("./wasm.wasm").then(function(wasm) {
		const result = wasm.get();
		switch(WATCH_STEP) {
			case "0":
				expect(result).toEqual(9);
				break;
			case "1":
				expect(result).toEqual(10);
				break;
			case "2":
				expect(result).toEqual(42);
				break;
			default:
				throw new Error("should not happen");
		}
	});
});
