// Folded away where the config leaves it false, so only the configs meant to take the
// runtime path are read as overriding the public path.
if (__OVERRIDDEN_PUBLIC_PATH__) {
	// The value is the one `auto` computes, so nothing but the naming path moves.
	__webpack_public_path__ = new URL("./", import.meta.url).href;
}

import fs from "fs";
import path from "path";

const outputPath = __STATS__.children[__INDEX__].outputPath;
const read = (file) => fs.readFileSync(path.join(outputPath, file), "utf8");
const bundle = () => read(`bundle${__INDEX__}.mjs`);

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
	const prefix = emitted[0].slice(
		0,
		emitted[0].lastIndexOf(".", emitted[0].length - 13)
	);
	const getFullHash = `${"__webpack_require__"}.h()`;

	if (!__OVERRIDDEN_PUBLIC_PATH__) {
		// Nothing reads the hash back: the whole url is a literal in the chunk holding
		// the reference, whichever form the name was written in.
		const chunks = fs
			.readdirSync(path.join(outputPath, __CHUNK_DIR__))
			.filter((name) => name.endsWith(".mjs"));

		expect(chunks).toHaveLength(1);
		expect(read(path.join(__CHUNK_DIR__, chunks[0]))).toContain(
			`new URL("../${prefix}.`
		);
		expect(bundle()).not.toContain(getFullHash);
	} else if (__INLINED__) {
		// A re-encoded digest cannot be read back at runtime, so it is already there.
		expect(bundle()).toContain(`"${prefix}.`);
		expect(bundle()).not.toContain(getFullHash);
	} else {
		expect(bundle()).toContain(getFullHash);
	}
});
