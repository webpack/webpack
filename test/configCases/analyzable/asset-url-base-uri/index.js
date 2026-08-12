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

for (const [name, entryBase] of Object.entries(__BASES__)) {
	it(`should settle ${name}'s own url rather than read it from the runtime`, () => {
		const source = read(name);
		expect(source).not.toContain(`${"__webpack_require__"}.b`);
		expect(source).toContain(
			// One resolving against the output root keeps the relative name it already has.
			entryBase === null
				? `${baked}./asset.txt"`
				: `${baked}${entryBase}asset.txt"`
		);
	});
}
