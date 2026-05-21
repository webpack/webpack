"use strict";

const fs = require("fs");
const path = require("path");

const readFile = (filename) =>
	fs.readFileSync(path.join(__dirname, filename), "utf-8");
const readMap = (filename) => JSON.parse(readFile(filename));

const URL_COMMENT_RE = /\n\/\/# sourceMappingURL=(\S+)\s*$/;

it("emits both maps and only the explicit plugin appends a sourceMappingURL", () => {
	const bundle = readFile("primary.js");
	// hidden-source-map has append:false; only the user's plugin appends.
	const match = URL_COMMENT_RE.exec(bundle);
	expect(match && match[1]).toBe("primary.js.secondary.map");

	// devtool=hidden-source-map produces the primary map (with sources).
	const primaryMap = readMap("primary.js.map");
	expect(primaryMap.version).toBe(3);
	expect(primaryMap.sourcesContent).toBeDefined();
	expect(primaryMap.sourcesContent.length).toBeGreaterThan(0);
	expect(primaryMap.sources.some((s) => /primary\.js$/.test(s))).toBe(true);

	// The explicit plugin produces a separate nosources map.
	const secondaryMap = readMap("primary.js.secondary.map");
	expect(secondaryMap.version).toBe(3);
	expect(secondaryMap.sourcesContent).toBeUndefined();
	expect(secondaryMap.sources.some((s) => /primary\.js$/.test(s))).toBe(true);
});
