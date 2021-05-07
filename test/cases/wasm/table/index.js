// the message is inconsistency between some nodejs versions
const UNKNOWN_FUNCTION_TABLE = /table index is out of bounds|invalid index into function table|invalid function/;

it("should support tables", function () {
	return import("./wasm-table.wat").then(function (wasm) {
		expect(wasm.callByIndex(0)).toEqual(42);
		expect(wasm.callByIndex(1)).toEqual(13);
		expect(() => wasm.callByIndex(2)).toThrow(UNKNOWN_FUNCTION_TABLE);
	});
});

it("should support exported tables", function () {
	return import("./wasm-table-export.wat").then(function (wasm) {
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

it("should support imported tables", function () {
	return import("./wasm-table-imported.wat").then(function (wasm) {
		expect(wasm.callByIndex(0)).toEqual(42);
		expect(wasm.callByIndex(1)).toEqual(13);
		expect(() => wasm.callByIndex(2)).toThrow(UNKNOWN_FUNCTION_TABLE);
	});
});
