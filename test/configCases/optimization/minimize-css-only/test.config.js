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
		expect(read("page.html")).toContain("html minify excluded marker");
		// CSS was not excluded, so it minifies as it would under `minimize: true`.
		const css = read("main.css");
		expect(css).toContain(".a{color:red}");
		expect(css).not.toContain("css minify excluded marker");
	}
};
