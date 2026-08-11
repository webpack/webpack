import fs from "fs";
import path from "path";

const read = (name) =>
	fs.readFileSync(path.join(__STATS__.outputPath, name), "utf8");
const analyzableImport = `${"__webpack_require__"}.ei(`;

it("should bake a literal when concatenation absorbed the consuming module", () => {
	const code = read("plain.mjs");

	// The chunk graph places the `ConcatenatedModule`, not `plain.js` inside it, so the
	// output depth this literal is relative to has to be read off the former.
	expect(code).toContain(analyzableImport);
	expect(code).toMatch(
		/import\((?:\/\*[^*]*\*\/\s*)?"\.\/plain-lazy_js\.mjs"\)/
	);
	expect(fs.existsSync(path.join(__STATS__.outputPath, "plain-lazy_js.mjs"))).toBe(
		true
	);
});

it("should keep the runtime form when the absorbed module reassigns the public path", () => {
	expect(read("overriding.mjs")).not.toContain(analyzableImport);
});

it("should load a chunk through the baked specifier", async () => {
	const { value } = await import("./plain-lazy");

	expect(value).toBe("plain-lazy");
});
