import fs from "fs";
import path from "path";

const read = (name) =>
	fs.readFileSync(path.join(__STATS__.outputPath, name), "utf8");
const analyzableImport = `${"__webpack_require__"}.ei(`;

it("should keep the runtime form in the entry that reassigns the public path", () => {
	expect(read("overriding.mjs")).not.toContain(analyzableImport);
});

it("should still bake in an entry that does not", () => {
	expect(read("plain.mjs")).toContain(analyzableImport);
	expect(read("plain.mjs")).toMatch(/import\((?:\/\*[^*]*\*\/\s*)?"\.\/plain-lazy_js\.mjs"\)/);
});
