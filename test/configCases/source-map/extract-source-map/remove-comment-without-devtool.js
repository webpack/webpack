"use strict";

const fs = require("fs");

require("./test1");
require("./test2");
require("./no-source-map");
require("./malformed-url");

it("should remove sourceMap comments when devtool is disabled", () => {
	const source = fs.readFileSync(__filename, "utf-8");
	// Split so this file's own text never matches the pattern
	const pattern = new RegExp("[#@]\\s*source" + "MappingURL\\s*=");
	expect(source).not.toMatch(pattern);
});
