import fs from "fs";
import path from "path";

const outputPath = __STATS__.children[__INDEX__].outputPath;
const bundle = () =>
	fs.readFileSync(path.join(outputPath, `bundle${__INDEX__}.mjs`), "utf8");

it("should load a wasm binary whose name carries the compilation hash", async () => {
	const { run } = await import("./module");

	expect(run()).toBe(84);
});

it("should assemble the name the binary was emitted under", () => {
	const emitted = fs
		.readdirSync(outputPath)
		.filter((name) => name.startsWith(__PREFIX__));

	expect(emitted).toHaveLength(2);
	// Everything before the per-module hash is fixed for the whole build.
	const prefix = emitted[0].slice(0, emitted[0].lastIndexOf(".", emitted[0].length - 13));
	const getFullHash = `${"__webpack_require__"}.h()`;

	if (__INLINED__) {
		// A re-encoded digest cannot be read back at runtime, so it is already there.
		expect(bundle()).toContain(`"${prefix}.`);
		expect(bundle()).not.toContain(getFullHash);
	} else {
		expect(bundle()).toContain(getFullHash);
	}
});
