"use strict";

const fs = require("fs");
const path = require("path");

module.exports = {
	findBundle(_i, options) {
		const files = fs.readdirSync(options.output.path);
		return files.includes("main.js") ? ["./main.js"] : undefined;
	},
	afterExecute(options) {
		const read = (name) =>
			fs.readFileSync(path.join(options.output.path, name), "utf8");
		// JS was not excluded: minifying drops the marker comment.
		expect(read("main.js")).not.toContain("javascript minify marker");
		// The excluded types keep the markers minifying would have dropped.
		expect(read("main.css")).toContain("css minify excluded marker");
		expect(read("page.html")).toContain("html minify excluded marker");
	}
};
