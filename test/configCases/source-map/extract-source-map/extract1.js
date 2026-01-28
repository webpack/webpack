"use strict";

const fs = require("fs");
const path = require("path");

require("./test1");
require("./no-source-map");

it("should extract source map - 1", () => {
	const fileData = fs.readFileSync(__filename + ".map").toString("utf-8");
	const { sources } = JSON.parse(fileData);
	expect(sources).toContain("webpack:///./extract1.js");
	expect(sources).toContain("webpack:///./charset-inline-source-map.txt");
	expect(sources).toContain("webpack:///./no-source-map.js");
});
