"use strict";

const fs = require("fs");
const path = require("path");

module.exports = {
	findBundle(index) {
		return [`bundle${index}.js`];
	},
	afterExecute(options) {
		const outputPath = /** @type {string} */ (options[0].output.path);
		const read = (name) => fs.readFileSync(path.join(outputPath, name), "utf8");

		for (const index of [0, 1]) {
			// Named `bundle<index>.js#<contenthash>` by `output.filename`.
			expect(read(`bundle${index}.js`)).not.toContain("webpackBootstrap");
			// Named `<index>/script.js#frag` by `assetModuleFilename`.
			expect(read(`${index}/script.js`)).toMatchSnapshot();
		}

		// The extension is read before the fragment, so `#a.css` claims nothing.
		expect(read("1/data.txt")).toBe("not   css  {\n");

		// Only the second build enables native CSS and HTML.
		expect(read("1/style.css")).toMatchSnapshot();
		expect(read("1/page.html")).toMatchSnapshot();
	}
};
