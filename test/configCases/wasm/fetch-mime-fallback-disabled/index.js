it("should not fall back to WebAssembly.instantiate when wasmStreamingFallback is disabled", function () {
	return import("./wasm.wat").then(
		() => {
			throw new Error("wasm streaming should have failed without a fallback");
		},
		(err) => {
			// streaming rejected on the wrong MIME type and was not recovered (message wording differs per engine)
			expect(String(err && err.message)).toMatch(/MIME type|content type/i);
		}
	);
});
