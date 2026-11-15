it("should keep wasm imports and exports named __proto__ as own properties", () =>
	import("./wasm.wat").then((wasm) => {
		expect(wasm.run()).toBe(42);
		expect(Object.prototype.hasOwnProperty.call(wasm, "__proto__")).toBe(true);
		expect(Object.getPrototypeOf(wasm)).not.toBe(wasm.__proto__);
		expect(wasm.__proto__()).toBe(7);
	}));
