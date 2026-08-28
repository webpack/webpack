import fs from "fs";
import path from "path";

const read = (file) =>
	fs.readFileSync(path.join(__STATS__.outputPath, file), "utf8");
const wasmUrl = (source) =>
	/\.v\(exports, [^,]+/.exec(source.replace(/\n/g, " "));

it("should bake the binary's url from the chunk the host fetched", () => {
	const match = wasmUrl(read("a.mjs"));
	expect(match).not.toBe(null);
	// The host fetched this chunk, so the public path is spelled from the root.
	expect(match[0]).toContain('new URL("./assets/');
});

it("should bake the binary's url from the chunk the loader fetched", () => {
	const match = wasmUrl(read(path.join("chunks", "shared_js.mjs")));
	expect(match).not.toBe(null);
	// The loader fetched this chunk through the public path, so the literal only
	// climbs back out of the chunk directory.
	expect(match[0]).toContain('new URL("../');
});

it("should not assemble either url at runtime", () => {
	const needle = `new URL(${"__webpack_require__"}.p + `;
	expect(read("a.mjs")).not.toContain(needle);
	expect(read(path.join("chunks", "shared_js.mjs"))).not.toContain(needle);
});
