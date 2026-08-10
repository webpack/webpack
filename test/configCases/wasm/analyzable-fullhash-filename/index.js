import fs from "fs";
import path from "path";

// Always referenced so the chunk under test exists; only called where the emitted
// name is one the runtime can actually find.
export const load = () => import("./module");

const outputPath = __STATS__.children[__INDEX__].outputPath;
// Found rather than named: the chunk's filename may carry a content hash.
const chunk = () => {
	const dir = path.join(outputPath, __CHUNK_DIR__);
	const file = fs.readdirSync(dir).find((name) => name.startsWith("module_js"));

	return fs.readFileSync(path.join(dir, file), "utf8");
};
// Built here so an assertion never matches this file's own source.
const byIdAndHash = `${"__webpack_require__"}.v(exports, module.id, "`;

if (__RUNS__) {
	it("should load an async WebAssembly module named with the compilation hash", async () => {
		const { run } = await load();
		expect(run()).toBe(84);
	});
}

if (__BAKED__) {
	it("should bake the binary's name, compilation hash and all", () => {
		const urls = chunk().match(/new URL\("[^"]+\.module\.wasm"/g);

		expect(urls).toHaveLength(2);
		for (const match of urls) {
			const specifier = match.slice('new URL("'.length, -1);
			// Relative to the chunk, which sits one directory down.
			expect(specifier.slice(0, 3)).toBe("../");
			expect(fs.existsSync(path.join(outputPath, specifier.slice(3)))).toBe(
				true
			);
		}
	});

	it("should hand the loader a url rather than an id to name the binary from", () => {
		expect(chunk()).not.toContain(byIdAndHash);
	});
} else {
	it("should keep the runtime form when the name cannot be filled in", () => {
		expect(chunk()).not.toMatch(/new URL\("[^"]+\.module\.wasm"/);
		expect(chunk()).toContain(byIdAndHash);
	});
}
