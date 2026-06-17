"use strict";

// node builtins are auto-externalized (node-commonjs) by the node target preset
const fs = require("fs");
const path = require("path");
// browser-only global, declared as a `global` external
const browserLocation = require("browserLocation");

const isBrowser = typeof window !== "undefined";

it("resolves each external on the platform that provides it", () => {
	if (isBrowser) {
		// the browser global resolves to the page location on web
		expect(typeof browserLocation).toBe("object");
		expect(String(browserLocation.href)).toContain("test.cases");
	} else {
		// on node the browser-only global is simply absent, not a crash
		expect(browserLocation).toBeUndefined();
		// while the node builtin resolves
		expect(typeof fs.readFileSync).toBe("function");
	}
});

it("loads node builtins defensively so the browser bundle never crashes", () => {
	const source = fs.readFileSync(
		path.join(__STATS__.outputPath, `bundle${__STATS_I__}.mjs`),
		"utf-8"
	);
	const header = source.slice(0, source.indexOf("__webpack_modules__"));
	// node builtin reached via getBuiltinModule, never a static `from "fs"` import
	expect(header).not.toMatch(/from\s+["']fs["']/);
	expect(header).toContain("getBuiltinModule");
});
