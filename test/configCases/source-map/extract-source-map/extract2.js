"use strict";

const fs = require("fs");

require("./test2");

it("should extract source map - 2", () => {
	const fileData = fs.readFileSync(__filename + ".map").toString("utf-8");
	const { sources } = JSON.parse(fileData);
	expect(sources).toContain("webpack:///./external-source-map.txt");
	expect(sources).toContain("webpack:///./extract2.js");
});
