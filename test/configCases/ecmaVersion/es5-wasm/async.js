it("should load an async wasm module without leaving es5", function (done) {
	import("./add.wat").then(function (module) {
		expect(module.add(1, 2)).toBe(3);
		done();
	}).catch(done);
});

it("should keep wasm imports and exports named __proto__ as own properties", function (done) {
	import("./proto.wat").then(function (module) {
		expect(module.run()).toBe(84);
		expect(Object.prototype.hasOwnProperty.call(module, "__proto__")).toBe(true);
		expect(module["__proto__"]()).toBe(7);
		done();
	}).catch(done);
});
