import fs from "fs";
import path from "path";
import { url } from "./shared";

const stats = __STATS__.children[__BAKED__ ? 0 : 1];
const bundle = () =>
	fs.readFileSync(path.join(stats.outputPath, __BUNDLE__), "utf8");
// Needle built at runtime so it is not a source string literal here.
const baked = `${"/* asset"} import */ "`;

it("should resolve the asset against the entry's baseUri", () => {
	expect(url.href).toBe(`${__BASE__}asset.txt`);
});

if (__BAKED__) {
	it("should settle the whole url here, base and all", () => {
		expect(bundle()).toContain(`${baked}${__BASE__}asset.txt"`);
		expect(bundle()).not.toContain(`${"__webpack_require__"}.b`);
	});
} else {
	it("should keep the runtime form when the entries disagree on the base", () => {
		expect(bundle()).not.toContain(baked);
		expect(bundle()).toContain(`${"__webpack_require__"}.b`);
	});
}
