"use strict";

const fs = require("fs");

require("./test4");

it("should extract source map - 4", () => {
	const fileData = fs.readFileSync(__filename + ".map").toString("utf-8");
	const { sources } = JSON.parse(fileData);
	expect(sources.includes("webpack:///antd/./components/button/index.tsx")).toBe(true);
});
