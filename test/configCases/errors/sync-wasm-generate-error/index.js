// `var` (not `const`) so the parser cannot fold the branch away and drop the
// dependency — the module must be built, only never executed.
var never = false;

it("should report what a sync wasm module failed to build with", () => {
	if (never) {
		import("./module");
	}
});
