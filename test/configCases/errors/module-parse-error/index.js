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
	let error;
	try {
		require("./broken.js");
	} catch (thrown) {
		error = thrown;
	}
	expect(error).toBeInstanceOf(SyntaxError);
	// the thrown message is the build error's, code frame included
	expect(error.message).toMatch(
		/^Module parse failed: Unexpected token[\s\S]*\n> 1 \| const = 1;/
	);
	expect(() => require("./broken.json")).toThrow(SyntaxError);
});

it("should throw a WebAssembly.CompileError for a malformed wasm module", async () => {
	// a rejected wasm binary is a compile error to the engine, not a syntax one
	await expect(import("./broken.wasm")).rejects.toThrow(
		WebAssembly.CompileError
	);
});

it("should throw a plain Error for a build failure that is not a parse error", () => {
	let thrown;
	try {
		require("./built.js");
	} catch (error) {
		thrown = error;
	}
	// a failed module stays cached, so only the first require throws at all
	expect(thrown).toBeInstanceOf(Error);
	expect(thrown.constructor).toBe(Error);
	const message = thrown.message;

	// the loader's own frame is kept and written relative to the context, while
	// the frames webpack and the engine own are cut off
	expect(message).toMatch(
		/^Module build failed \(from .*loader\.js\):\nError: loader boom\n/
	);
	expect(message).toMatch(/\.\/loader\.js:\d+:\d+/);
	expect(message).not.toMatch(/[\s(](?:\/|[A-Za-z]:[\\/])/);
});
