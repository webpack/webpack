import fs from "fs";
import path from "path";

// Referenced but never called — the baked url is what is under test.
export const load = () => import(/* webpackChunkName: "lazy" */ "./lazy");

const stats = __STATS__.children[__INDEX__];
// Only the wasm chunk — this file's own needles would satisfy the assertions.
// Found rather than named: the chunk's filename may carry a content hash.
const chunk = () => {
	const dir = path.join(stats.outputPath, __CHUNK_DIR__);
	const file = fs.readdirSync(dir).find((name) => name.startsWith("lazy"));

	return fs.readFileSync(path.join(dir, file), "utf8");
};

if (__BAKED__) {
	it("should bake the compilation hash into the binary's url", () => {
		const url = chunk().match(/new URL\("https:\/\/example\.com\/([^/]+)\//);

		expect(url).not.toBe(null);
		if (__HASH_FREE__) {
			expect(url[1]).toBe("fn");
		} else if (__DIGEST__) {
			// A digest re-encodes the hash, so decode it back to compare.
			const hex = Buffer.from(
				url[1].replace(/-/g, "+").replace(/_/g, "/"),
				"base64"
			).toString("hex");

			expect(hex.startsWith(stats.hash)).toBe(true);
		} else {
			expect(stats.hash.startsWith(url[1])).toBe(true);
		}
	});

	it("should not assemble the binary's url at runtime", () => {
		// Needle built at runtime so it is not a source string literal here.
		expect(chunk()).not.toContain(`new URL(${"__webpack_require__"}.p + `);
	});
} else {
	it("should keep the runtime form when the public path cannot be filled in", () => {
		expect(chunk()).not.toMatch(/new URL\("https:/);
		// The loader names the binary from the module id and hash instead.
		expect(chunk()).toContain(`${"__webpack_require__"}.v(exports, module.id, "`);
	});
}
