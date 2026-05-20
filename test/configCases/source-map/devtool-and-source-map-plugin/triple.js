"use strict";

const fs = require("fs");
const path = require("path");

const readFile = (filename) =>
	fs.readFileSync(path.join(__dirname, filename), "utf-8");
const readMap = (filename) => JSON.parse(readFile(filename));

const URL_COMMENT_RE = /\n\/\/# sourceMappingURL=(\S+)\s*$/;

it("supports three SourceMapDevToolPlugin instances on the same asset", () => {
	const bundle = readFile("triple.js");

	// Only the last plugin appends (the first two use `append: false`).
	const match = URL_COMMENT_RE.exec(bundle);
	expect(match && match[1]).toBe("triple.js.c.map");

	const a = readMap("triple.js.a.map");
	const b = readMap("triple.js.b.map");
	const c = readMap("triple.js.c.map");

	expect(a.version).toBe(3);
	expect(b.version).toBe(3);
	expect(c.version).toBe(3);

	// All three describe the same generated file, so the mappings line up.
	expect(b.mappings).toBe(a.mappings);
	expect(c.mappings).toBe(a.mappings);

	// `noSources: true` only on the middle plugin.
	expect(a.sourcesContent).toBeDefined();
	expect(b.sourcesContent).toBeUndefined();
	expect(c.sourcesContent).toBeDefined();

	// `sourceRoot: "triple"` only on the last plugin.
	expect(c.sourceRoot).toBe("triple");
});
