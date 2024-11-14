it("should work", function() {
	return import("./pkg/wasm_lib.js").then(function(module) {
		expect(module.test("my-str")).toBe("my-str");
	});
});
