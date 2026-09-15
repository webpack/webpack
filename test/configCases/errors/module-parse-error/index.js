// `var` (not `const`) so the parser cannot fold the branch away and drop the
// dependencies — the modules must be built, only never executed.
var never = false;

it("should build every failing module without crashing", () => {
	if (never) {
		require("./broken.js");
		require("./broken.json");
		require("./built.js");
	}
});

it("should throw a SyntaxError when a module that failed to parse is executed", () => {
	expect(() => require("./broken.js")).toThrow(SyntaxError);
	expect(() => require("./broken.json")).toThrow(SyntaxError);
});

it("should throw a WebAssembly.CompileError for a malformed wasm module", async () => {
	// a rejected wasm binary is a compile error to the engine, not a syntax one
	await expect(import("./broken.wasm")).rejects.toThrow(
		WebAssembly.CompileError
	);
});

it("should throw a plain Error for a build failure that is not a parse error", () => {
	// anchored: the loader's own frame is kept and written relative to the
	// context, while the frames webpack and the engine own are cut off
	expect(() => require("./built.js")).toThrow(
		/^Module build failed \(from .*loader\.js\):\nError: loader boom\n {4}at Object\.loader \(\.\/loader\.js:\d+:\d+\)$/
	);
	expect(() => require("./built.js")).not.toThrow(SyntaxError);
});
