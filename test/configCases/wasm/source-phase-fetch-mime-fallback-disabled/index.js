it("should not fall back to WebAssembly.compile when wasmStreamingFallback is disabled", function () {
	return import("./module").then(
		() => {
			throw new Error("wasm streaming compile should have failed without a fallback");
		},
		(err) => {
			// streaming compile rejected on the wrong MIME type and was not recovered (message wording differs per engine)
			expect(String(err && err.message)).toMatch(/MIME type|content type/i);
		}
	);
});
