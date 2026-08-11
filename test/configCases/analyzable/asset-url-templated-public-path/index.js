import fs from "fs";
import path from "path";

// Never dereferenced — the harness cannot fetch an absolute CDN url.
export const url = new URL("./asset.txt", import.meta.url);

const stats = __STATS__.children[__INDEX__];
const bundle = () =>
	fs.readFileSync(path.join(stats.outputPath, `bundle${__INDEX__}.mjs`), "utf8");

it("should keep the asset referenced", () => {
	expect(typeof url).toBe("object");
});

it("should bake the public path's compilation hash into the specifier", () => {
	const specifier = bundle().match(
		/\/\* asset import \*\/ "(https:\/\/cdn\.example\.com\/[^"]+)"/
	);

	expect(specifier).not.toBe(null);
	const [, hash, file] = specifier[1]
		.split("https://cdn.example.com/")[1]
		.match(/^([^/]+)\/(.+)$/);

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
	expect(fs.existsSync(path.join(stats.outputPath, file))).toBe(true);
});

it("should not fall back to the runtime asset url", () => {
	expect(bundle()).not.toContain(`${"__webpack_require__"}.b`);
});
