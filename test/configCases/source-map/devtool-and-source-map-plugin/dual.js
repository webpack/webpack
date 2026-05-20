"use strict";

const fs = require("fs");
const path = require("path");

const readFile = (filename) =>
	fs.readFileSync(path.join(__dirname, filename), "utf-8");
const readMap = (filename) => JSON.parse(readFile(filename));

const URL_COMMENT_RE = /\n\/\/# sourceMappingURL=(\S+)\s*$/;

it("supports two SourceMapDevToolPlugin instances on the same asset", () => {
	const bundle = readFile("dual.js");

	// The first plugin uses append:false, the second appends, so only the
	// second plugin's URL ends up in the bundle.
	const match = URL_COMMENT_RE.exec(bundle);
	expect(match && match[1]).toBe("dual.js.nosources.map");

	const fullMap = readMap("dual.js.full.map");
	expect(fullMap.version).toBe(3);
	expect(fullMap.sourcesContent).toBeDefined();
	expect(fullMap.sourcesContent.length).toBeGreaterThan(0);
	expect(fullMap.sources.some((s) => /dual\.js$/.test(s))).toBe(true);

	const nosourcesMap = readMap("dual.js.nosources.map");
	expect(nosourcesMap.version).toBe(3);
	expect(nosourcesMap.sourcesContent).toBeUndefined();
	expect(nosourcesMap.sources.some((s) => /dual\.js$/.test(s))).toBe(true);
	// The two maps should describe the same generated file with the same
	// mappings — they only differ in whether sourcesContent is embedded.
	expect(nosourcesMap.mappings).toBe(fullMap.mappings);
});
