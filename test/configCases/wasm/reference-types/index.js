it("should work", function() {
	return import("./pkg/wasm_lib.js").then(function(module) {
		const cls = new module.Stuff();
		expect(cls.refThing("my-str")).toBe("my-str");
	});
});
