import fs from "fs";
import path from "path";
import { url } from "./url-only";

const stats = __STATS__.children[__INDEX__];
const bundle = () =>
	fs.readFileSync(path.join(stats.outputPath, `bundle${__INDEX__}.mjs`), "utf8");
// Needles built at runtime so they are not source string literals here. The wrapper
// reads the runtime public path, or bakes the url where analyzable output can.
const runtimeWrapper = `${"module"}.exports = ${"__webpack_require__"}.p + `;
const bakedWrapper = `${"module"}.exports = new URL(`;
const hasWrapper = () =>
	bundle().includes(runtimeWrapper) || bundle().includes(bakedWrapper);

it("should point at the asset whatever the module exposes", () => {
	expect(String(url).endsWith("/asset.txt")).toBe(true);
});

if (__WRAPPER__) {
	it("should keep the wrapper while something still reads it", () => {
		expect(hasWrapper()).toBe(true);
	});
} else {
	it("should drop the wrapper no one reads", () => {
		expect(hasWrapper()).toBe(false);
	});
}
