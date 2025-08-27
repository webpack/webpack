"use strict";

const fs = require("fs");
const path = require("path");

require("./test3");

it("should extract source map - 3", () => {
	const fileData = fs.readFileSync(path.resolve(__dirname, "bundle2.js.map")).toString("utf-8");
	const { sources } = JSON.parse(fileData);
	expect(sources).toMatchSnapshot();
});
