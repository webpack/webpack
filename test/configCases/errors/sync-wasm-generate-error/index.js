const fs = require("fs");
const path = require("path");

// `var` (not `const`) so the parser cannot fold the branch away and drop the
// dependency — the module must be built, only never executed.
var never = false;

it("should report what a sync wasm module failed to build with", () => {
	if (never) {
		import("./module");
	}
});

it("should write the loader's own frame relative into the emitted asset", () => {
	const emitted = __STATS__.assets
		.map((asset) => asset.name)
		.filter((name) => name.endsWith(".wasm"));

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
