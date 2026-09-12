import fs from "fs";
import path from "path";

const read = (name) =>
	fs.readFileSync(path.join(__STATS__.outputPath, name), "utf8");
const importMap = `${"chunkImports"} = {`;

it("should keep the runtime form in the entry that reassigns the public path", () => {
	expect(read("overriding.mjs")).not.toContain(importMap);
});

it("should still bake in an entry that does not", () => {
	expect(read("plain.mjs")).toContain(importMap);
	expect(read("plain.mjs")).toMatch(/import\((?:\/\*[^*]*\*\/\s*)?"\.\/plain-lazy_js\.mjs"\)/);
});
