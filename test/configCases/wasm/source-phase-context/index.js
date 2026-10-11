for (const [mode, load] of [
	["lazy", name => import.source(`./modules/${name}.wat`)],
	["eager", name => import.source(/* webpackMode: "eager" */ `./modules/${name}.wat`)],
	["lazy-once", name => import.source(/* webpackMode: "lazy-once" */ `./modules/${name}.wat`)],
	["weak", name => import.source(/* webpackMode: "weak" */ `./modules/${name}.wat`)],
	["magic comment", name => import(/* webpackSource: true */ `./modules/${name}.wat`)]
]) {
	it(`should import a Wasm source with host imports through a ${mode} context`, async () => {
		const expected = await import.source("./modules/imported.wat");
		const source = await load("imported");
		expect(source).toBeInstanceOf(WebAssembly.Module);
		expect(source).toBe(expected);
		expect(WebAssembly.Module.imports(source)).toEqual([
			{ module: "env", name: "get", kind: "function" }
		]);
		const instance = await WebAssembly.instantiate(source, {
			env: { get: () => 42 }
		});
		expect(instance.exports.get()).toBe(42);
	});

	it(`should reject a missing Wasm source in a ${mode} context`, async () => {
		await expect(load("missing")).rejects.toMatchObject({
			code: "MODULE_NOT_FOUND"
		});
	});
}

it("should keep source and evaluation contexts for the same request separate", async () => {
	let name = "value";
	const source = await import.source(`./shared/${name}.wat`);
	const evaluated = await import(`./shared/${name}.wat`);
	expect(source).toBeInstanceOf(WebAssembly.Module);
	expect(evaluated.get()).toBe(42);
	const instance = await WebAssembly.instantiate(source);
	expect(instance.exports.get()).toBe(42);
});

it("should evaluate import options before resolving a source context", async () => {
	let name = "imported";
	const calls = [];
	const source = await import.source(
		`./modules/${(calls.push("request"), name)}.wat`,
		(calls.push("options"), {})
	);
	expect(calls).toEqual(["request", "options"]);
	expect(source).toBeInstanceOf(WebAssembly.Module);
});
