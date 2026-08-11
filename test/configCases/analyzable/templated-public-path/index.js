import fs from "fs";
import path from "path";

// Referenced so the chunk exists, never executed — the harness cannot fetch an
// absolute CDN url.
const load = () => import(/* webpackChunkName: "dynamic" */ "./dynamic.js");

const stats = __STATS__.children[__INDEX__];
const bundle = () =>
	fs.readFileSync(path.join(stats.outputPath, `bundle${__INDEX__}.mjs`), "utf8");
// Built here so an assertion never matches this file's own source.
const ensureChunkCall = `${"__webpack_require__"}.e(`;

it("should keep the chunk referenced", () => {
	expect(typeof load).toBe("function");
});

if (__BAKED__) {
	it("should bake the public path's compilation hash into the specifier", () => {
		const specifier = bundle().match(
			/import\((?:\/\*[^*]*\*\/\s*)?"(https:\/\/cdn\.example\.com\/[^"]+)"\)/
		);

		expect(specifier).not.toBe(null);
		const url = specifier[1];
		const [, hash, file] = url.split("https://cdn.example.com/")[1].match(
			/^([^/]+)\/(.+)$/
		);

		if (__DIGEST__) {
			// A digest re-encodes the hash, so decode it back to compare.
			const hex = Buffer.from(
				hash.replace(/-/g, "+").replace(/_/g, "/"),
				"base64"
			).toString("hex");

			expect(hex.startsWith(stats.hash)).toBe(true);
		} else {
			expect(hash).toBe(__SLICE__ ? stats.hash.slice(0, __SLICE__) : stats.hash);
		}
		// The name in the specifier is the one that reached disk.
		expect(fs.existsSync(path.join(stats.outputPath, file))).toBe(true);
	});

	it("should not fall back to the runtime chunk loader", () => {
		expect(bundle()).toContain(`${"__webpack_require__"}.ei(`);
		expect(bundle()).not.toContain(ensureChunkCall);
	});
} else {
	it("should keep the runtime form when the public path cannot be filled in", () => {
		expect(bundle()).not.toMatch(/import\((?:\/\*[^*]*\*\/\s*)?"https:/);
		expect(bundle()).toContain(ensureChunkCall);
	});
}
