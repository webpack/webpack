import foo from "./foo.js";
import bar from "./bar.js";

it("should not contain non javascript chunk in the main bundle", () => {
	const fs = require("fs");
	const source = fs.readFileSync(__STATS__.outputPath + "/main.mjs", "utf-8");

	expect(__STATS__.chunks.some(c => c.names.includes("style"))).toBe(true);
	// Should not import "./style.mjs";`
	expect(source).not.toMatch(
		/import\s\*\sas+\s__webpack_chunk_[0-9]+__\sfrom\s"\.\/style\.mjs"/g
	);
	expect(foo + bar).toBe(12);
});
