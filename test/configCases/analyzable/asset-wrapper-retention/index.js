import fs from "fs";
import path from "path";
import { url } from "./url-only";

const stats = __STATS__.children[__INDEX__];
const bundle = () =>
	fs.readFileSync(path.join(stats.outputPath, `bundle${__INDEX__}.mjs`), "utf8");
// Needle built at runtime so it is not a source string literal here.
const wrapper = `${"module"}.exports = ${"__webpack_require__"}.p + `;

it("should point at the asset whatever the module exposes", () => {
	expect(String(url).endsWith("/asset.txt")).toBe(true);
});

if (__WRAPPER__) {
	it("should keep the wrapper while something still reads it", () => {
		expect(bundle()).toContain(wrapper);
	});
} else {
	it("should drop the wrapper no one reads", () => {
		expect(bundle()).not.toContain(wrapper);
	});
}
