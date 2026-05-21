"use strict";

const fs = require("fs");
const path = require("path");

const readFile = (filename) =>
	fs.readFileSync(path.join(__dirname, filename), "utf-8");
const readMap = (filename) => JSON.parse(readFile(filename));

const DEBUG_ID_RE =
	/[a-f0-9]{8}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{12}/i;

it("wraps a function `append` so the `debugId` comment prepends at call time", () => {
	const bundle = readFile("debug-fn.js");

	// The append function was wrapped, not stringified — its dynamic URL
	// should appear in the bundle and the debug-id comment should be in front
	// of it, both produced at call time.
	const debugIdMatch = bundle.match(/\n\/\/# debugId\s*=\s*(\S+)/);
	expect(debugIdMatch).not.toBeNull();
	expect(DEBUG_ID_RE.test(debugIdMatch[1])).toBe(true);

	expect(bundle).toMatch(
		"//# sourceMappingURL=https://example.invalid/debug-fn.js.map"
	);

	// Make sure the function wasn't stringified into the output (would
	// contain `(pathData) =>` or similar source-text fragments).
	expect(bundle).not.toMatch(/=>\s*`\\n\/\/# source/);

	const map = readMap("debug-fn.js.map");
	expect(map.debugId).toBe(debugIdMatch[1]);
});
