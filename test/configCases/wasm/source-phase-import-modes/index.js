for (const [mode, load] of [
	["eager", () => import.source(/* webpackMode: "eager" */ "./wasm.wat")],
	["weak", () => import.source(/* webpackMode: "weak" */ "./wasm.wat")],
	["eager comment", () => import(/* webpackMode: "eager", webpackSource: true */ "./wasm.wat")],
	["weak comment", () => import(/* webpackMode: "weak", webpackSource: true */ "./wasm.wat")]
]) {
	it(`should return a WebAssembly.Module for ${mode} source imports`, async () => {
		const expected = await import.source("./wasm.wat");
		const source = await load();
		expect(source).toBeInstanceOf(WebAssembly.Module);
		expect(source).toBe(expected);
		const instance = await WebAssembly.instantiate(source);
		expect(instance.exports.get()).toBe(42);
	});
}

for (const [mode, load] of [
	["eager", () => import(/* webpackMode: "eager" */ "./wasm.wat")],
	["weak", () => import(/* webpackMode: "weak" */ "./wasm.wat")]
]) {
	it(`should keep the exports of ${mode} evaluation imports`, async () => {
		const expected = await import("./wasm.wat");
		const evaluated = await load();
		expect(evaluated).toBe(expected);
		expect(evaluated.get()).toBe(42);
	});
}

it("should reject a weak source import when the module is unavailable", async () => {
	await expect(
		import.source(/* webpackMode: "weak" */ "./wasm.wat?unavailable")
	).rejects.toMatchObject({ code: "MODULE_NOT_FOUND" });
});
