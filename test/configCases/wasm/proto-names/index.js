it("should keep wasm imports and exports named __proto__ as own properties", () =>
	import("./wasm.wat").then((wasm) => {
		expect(wasm.run()).toBe(42);
		expect(Object.prototype.hasOwnProperty.call(wasm, "__proto__")).toBe(true);
		expect(Object.getPrototypeOf(wasm)).not.toBe(wasm.__proto__);
		expect(wasm.__proto__()).toBe(7);
	}));

it("should keep an imported global re-exported as __proto__ as an own property", () =>
	import("./global.wat").then((wasm) => {
		expect(Object.prototype.hasOwnProperty.call(wasm, "__proto__")).toBe(true);
		expect(Object.getPrototypeOf(wasm)).not.toBe(wasm.__proto__);
		// Without WebAssembly.Global the export is the plain value
		expect(
			WebAssembly.Global ? wasm.__proto__.value : wasm.__proto__
		).toBe(5);
	}));
