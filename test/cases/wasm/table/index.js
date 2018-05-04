it("should support tables", function() {
	return import("./wasm-table.wasm").then(function(wasm) {
		expect(wasm.callByIndex(0)).toEqual(42);
		expect(wasm.callByIndex(1)).toEqual(13);
		expect(() => wasm.callByIndex(2)).toThrow("invalid function");
	});
});

it("should support exported tables", function() {
	return import("./wasm-table-export.wasm").then(function(wasm) {
		expect(wasm.table).toBeInstanceOf(WebAssembly.Table);
		expect(wasm.table.length).toBe(2);
		const e0 = wasm.table.get(0);
		const e1 = wasm.table.get(1);
		expect(e0).toBeInstanceOf(Function);
		expect(e1).toBeInstanceOf(Function);
		expect(e0()).toEqual(42);
		expect(e1()).toEqual(13);
	});
});

it("should support imported tables", function() {
	return import("./wasm-table-imported.wasm").then(function(wasm) {
		expect(wasm.callByIndex(0)).toEqual(42);
		expect(wasm.callByIndex(1)).toEqual(13);
		expect(() => wasm.callByIndex(2)).toThrow("fefef");
	});
});
