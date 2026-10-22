const fs = require("fs");
const path = require("path");

// `var` (not `const`) so the parser cannot fold the branch away and drop the
// dependency — the module must be built, only never executed.
var never = false;

it("should report what a sync wasm module failed to build with", () => {
	if (never) {
		import("./module");
		import("./broken");
	}
});

/**
 * @param {string} name the chunk's name prefix
 * @returns {string} the chunk's emitted source
 */
const readChunk = (name) => {
	const file = __STATS__.assets
		.map((asset) => asset.name)
		.find((asset) => asset.startsWith(name) && asset.endsWith(".js"));
	expect(file).toBeDefined();
	return fs.readFileSync(path.join(__STATS__.outputPath, file), "utf8");
};

// asserted on the generated source: a sync wasm module cannot show this at
// runtime, the engine rejects the emitted asset before the throw is reached
it("should throw a plain Error from the module a loader failed to build", () => {
	const source = readChunk("module_js");
	expect(source).toContain("throw new Error(");
	expect(source).not.toContain("WebAssembly.CompileError");
});

it("should throw a WebAssembly.CompileError from a binary the parser rejected", () => {
	expect(readChunk("broken_js")).toContain(
		"throw new WebAssembly.CompileError("
	);
});

it("should write the loader's own frame relative into the emitted asset", () => {
	// `broken.wasm` emits one too, so pick the one `module.js`'s chunk carries
	const emitted = __STATS__.assets
		.filter(
			(asset) =>
				asset.name.endsWith(".wasm") &&
				asset.auxiliaryChunks.includes("module_js")
		)
		.map((asset) => asset.name);

	expect(emitted).toHaveLength(1);

	const content = fs.readFileSync(
		path.join(__STATS__.outputPath, emitted[0]),
		"utf8"
	);

	expect(content).toMatch(
		/^Module build failed \(from \.\/loader\.js\):\nError: sync wasm boom\n/
	);
	expect(content).toMatch(/\.\/loader\.js:\d+:\d+/);
	expect(content).not.toMatch(/[\s(](?:\/|[A-Za-z]:[\\/])/);
});
