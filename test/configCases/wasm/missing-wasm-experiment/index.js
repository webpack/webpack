it("should not compile the module", function () {
	expect(() => require("./wasm.wasm"));
});
