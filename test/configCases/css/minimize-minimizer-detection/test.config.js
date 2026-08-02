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

		// Nothing in the configuration claims either type, so webpack minifies
		// both itself (the banner is `BannerPlugin`'s, and its presence shows that
		// plugin was not mistaken for a CSS minimizer).
		expect(read("main.css")).toBe("/*! banner */.native{color:red}");
		expect(read("page.html")).toContain("<!DOCTYPE html><html lang=en>");
	}
};
