"use strict";

const fs = require("fs");
const path = require("path");

require("./test1");
require("./no-source-map")

it("should extract source map - 1", () => {
	const fileData = fs.readFileSync(path.resolve(__dirname, "bundle1.js.map")).toString("utf-8");
	const { sources } = JSON.parse(fileData);
	expect(sources).toMatchSnapshot();
	expect(1).toBe(1)
});
