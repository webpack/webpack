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

if (__BAKED__) {
	it("should bake the value the function returns", () => {
		const specifier = bundle().match(
			/asset import \*\/ "(https:\/\/cdn\.example\.com\/[^"]+)"/
		);

		expect(specifier).not.toBe(null);
		expect(specifier[1]).toBe(
			`https://cdn.example.com/${__HASHED__ ? `${stats.hash}/` : ""}asset.txt`
		);
		expect(bundle()).not.toContain(`${"__webpack_require__"}.b`);
	});
} else {
	it("should keep the runtime form when the value moves with the hash", () => {
		expect(bundle()).not.toMatch(/\/\* asset import \*\/ "https:/);
		expect(bundle()).toContain(`${"__webpack_require__"}.b`);
	});
}
