"use strict";

const fs = require("fs");

it("includes only the sources inside the module's package", () => {
	expect(require("./pkg/dist/dep.js").value).toBe(1);
	const { sources, sourcesContent } = JSON.parse(
		fs.readFileSync(`${__filename}.map`, "utf-8")
	);
	const content = (name) =>
		sourcesContent[sources.findIndex((source) => source.endsWith(name))];
	expect(content("pkg/src/dep.ts")).toBe("export const value: number = 1;\n");
	// joined here, so this file's own source does not hold it
	expect(sourcesContent.join("")).not.toContain(
		["outside", "of", "the", "package"].join("-")
	);
});
