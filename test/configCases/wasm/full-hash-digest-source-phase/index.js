const fs = require("fs");
const path = require("path");

it("should load a source-phase binary named by a re-encoded compilation hash", async () => {
	const { run } = await import("./module");

	expect(run()).toBe(84);
});

it("should inline the hash rather than read it back at runtime", () => {
	const bundle = fs.readFileSync(
		path.join(__STATS__.outputPath, "bundle0.js"),
		"utf8"
	);

	expect(bundle).toContain(".compile.wasm");
	expect(bundle).not.toContain(`${"__webpack_require__"}.h()`);
});
