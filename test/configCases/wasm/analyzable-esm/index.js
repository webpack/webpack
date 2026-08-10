import fs from "fs";
import path from "path";

it("should instantiate wasm from chunks at both depths", async () => {
	const [flat, deep] = await Promise.all([
		import(/* webpackChunkName: "flat" */ "./flat"),
		import(/* webpackChunkName: "deep" */ "./deep")
	]);

	expect(flat.run()).toBe(42);
	expect(deep.run()).toBe(84);
});

it("should hand the baked url straight to the loader", () => {
	// The call site already resolved against `import.meta.url`, so the node backend
	// must not wrap it a second time.
	const runtime = fs.readFileSync(
		path.join(__STATS__.children[0].outputPath, "bundle0.mjs"),
		"utf8"
	);

	expect(runtime).toContain(`readFile(${"wasmModuleUrl"},`);
	expect(runtime).not.toContain(`readFile(new URL(${"wasmModuleUrl"}`);
});

it("should reference the wasm binary in the expected form", () => {
	const source = fs.readFileSync(
		path.join(__STATS__.children[0].outputPath, __WASM_CHUNK__),
		"utf8"
	);

	expect(source).toContain(__WASM_REF__);
});
