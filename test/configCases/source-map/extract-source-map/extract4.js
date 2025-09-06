"use strict";

const fs = require("fs");
const path = require("path");

require("./test4");

it("should extract source map - 4", () => {
	const fileData = fs.readFileSync(path.resolve(__dirname, "bundle3.js.map")).toString("utf-8");
	const { sources } = JSON.parse(fileData);
	expect(sources.includes("webpack:///antd/./components/button/index.tsx")).toBe(true);
});
