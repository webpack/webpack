it("should fall back to javascript for an inline loader request", () => {
	expect(require("./js-loader.js!./inline.wasm")).toBe(
		"LOADED_BY_CUSTOM_LOADER"
	);
});

it("should fall back to javascript for a hook-injected loader", () => {
	expect(require("./injected.wasm")).toBe("LOADED_BY_CUSTOM_LOADER");
});

it("should keep the built-in async wasm type for loader-free .wasm files", () =>
	import("./plain.wasm").then((wasm) => {
		expect(wasm.add(1, 2)).toBe(3);
	}));
