"use strict";

const fs = require("fs");
const path = require("path");

// `output.filename` is `[name].js`, so the test entry bundle is `main.js`.
module.exports = {
	findBundle(_i, options) {
		const files = fs.readdirSync(options.output.path);
		return files.includes("main.js") ? ["./main.js"] : undefined;
	},
	afterExecute(options) {
		const read = (name) =>
			fs.readFileSync(path.join(options.output.path, name), "utf8");

		// CSS is claimed through `include`, so webpack leaves it entirely to the
		// configured minimizer — here one that does nothing, which is what
		// claiming a whole type on a coarse match costs.
		expect(read("main.css")).toContain("\n");

		// HTML is claimed by nothing, so webpack still minifies it.
		expect(read("page.html")).toContain('<!DOCTYPE html><html lang="en">');
	}
};
