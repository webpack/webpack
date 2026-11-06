import { readFileSync } from "fs";

const isBrowser = typeof window !== "undefined";

// Built dynamically so the asserted phrase never appears verbatim in this file,
// which is itself embedded into the bundle being inspected.
const staticImport = new RegExp(`${"from"}\\s+"node:fs"`);

it("should read the ESM-imported builtin on node", () => {
	if (!isBrowser) {
		expect(typeof readFileSync).toBe("function");
	}
});

it("should statically import the builtin only when the getter is unknown", () => {
	if (isBrowser) return;
	const source = readFileSync(
		require("path").join(
			__STATS__.children[__STATS_I__].outputPath,
			`bundle${__STATS_I__}.mjs`
		),
		"utf-8"
	);
	const header = source.slice(0, source.indexOf("__webpack_modules__"));
	if (__STATS_I__ === 0) {
		expect(header).not.toMatch(staticImport);
		expect(source).toContain(`${"getBuiltinModule"}("node:fs")`);
	} else {
		expect(header).toMatch(staticImport);
	}
});
