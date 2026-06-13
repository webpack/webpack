"use strict";

it("should load node builtins via dynamic import() in a universal bundle", async () => {
	const os = await import("os");
	const fs = await import("fs");
	const path = await import("path");

	expect(typeof os.platform).toBe("function");
	expect(typeof fs.readFileSync).toBe("function");

	const source = fs.readFileSync(
		path.join(__STATS__.outputPath, `bundle${__STATS_I__}.mjs`),
		"utf-8"
	);
	// only the createRequire/import setup, excluding module bodies (which embed this test source)
	const header = source.slice(0, source.indexOf("__webpack_modules__"));

	// dynamic import() must stay lazy: nothing hoisted that would crash a browser at load
	expect(header).not.toContain('from "os"');
	expect(header).not.toContain('from "fs"');
});
