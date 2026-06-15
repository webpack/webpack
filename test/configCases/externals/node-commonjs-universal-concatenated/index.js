import * as fs from "fs";
import * as path from "path";

it("should load a concatenated node-commonjs external in a universal bundle", () => {
	expect(typeof fs.readFileSync).toBe("function");
	expect(typeof path.join).toBe("function");

	const source = fs.readFileSync(
		path.join(__STATS__.outputPath, `bundle${__STATS_I__}.mjs`),
		"utf-8"
	);
	// even when the external is concatenated (no `compilation` in the inner code-gen
	// context), it must not fall back to a hoisted static import that crashes a browser
	const staticImport = "createRequire as __WEBPACK_EXTERNAL_" + "createRequire";
	expect(source).not.toContain(staticImport);
});
