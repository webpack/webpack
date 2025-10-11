"use strict";

const fs = require("fs");
const path = require("path");

require("./test3");

it("should extract source map - 3", () => {
	const fileData = fs.readFileSync(__filename + ".map").toString("utf-8");
	const { sources } = JSON.parse(fileData);
	expect(sources).toContain("webpack:///./external-source-map.txt");
	expect(sources).toContain("webpack:///./extract3.js");
});
