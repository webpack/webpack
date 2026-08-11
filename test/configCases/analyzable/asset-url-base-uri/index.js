import fs from "fs";
import path from "path";
import { url } from "./shared";

const stats = __STATS__.children[__INDEX__];
const read = (name) =>
	fs.readFileSync(path.join(stats.outputPath, `${__PREFIX__}-${name}.mjs`), "utf8");
// Needle built at runtime so it is not a source string literal here.
const baked = `${"/* asset"} import */ "`;

it("should resolve the asset against the entry's baseUri", () => {
	expect(url.href).toBe(`${__BASE__}asset.txt`);
});

if (__BAKED__) {
	it("should settle the whole url here, base and all", () => {
		expect(read("main")).toContain(`${baked}${__BASE__}asset.txt"`);
		expect(read("main")).not.toContain(`${"__webpack_require__"}.b`);
	});
} else {
	it("should keep the runtime form when the entries disagree on the base", () => {
		// Read the other entry too: this one's own base is the one that would be baked,
		// so only the entry that disagrees shows a wrong literal.
		for (const source of [read("main"), read("other")]) {
			expect(source).not.toContain(baked);
			expect(source).toContain(`${"__webpack_require__"}.b`);
		}
	});
}
