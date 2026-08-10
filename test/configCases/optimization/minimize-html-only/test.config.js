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
		// The excluded types keep the markers minifying would have dropped.
		expect(read("main.js")).toContain("javascript minify excluded marker");
		expect(read("main.css")).toContain("css minify excluded marker");
		// HTML minifies — its inline CSS too, but at the defaults: the length
		// keeps its unit.
		const page = read("page.html");
		expect(page).not.toContain("html comment the minifier drops");
		expect(page).toContain("width:16px");
	}
};
