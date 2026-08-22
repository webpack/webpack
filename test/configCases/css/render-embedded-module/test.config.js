"use strict";

const fs = require("fs");
const path = require("path");

module.exports = {
	findBundle() {
		return ["./bundle0.js"];
	},
	afterExecute(options) {
		const outputPath = /** @type {string} */ (options.output.path);
		const read = (name) => fs.readFileSync(path.join(outputPath, name), "utf8");

		// The hook runs after the dependency templates, so the asset url is already
		// resolved by the time it sees the sheet.
		const bundle = read("bundle0.js");
		expect(bundle).toMatch(
			/\.embedded-style\{background:url\(\w+\.png\);color:red;margin:0\}/
		);
		expect(bundle).not.toContain("#ff0000");

		// A sheet that stays a `.css` asset never reaches the hook — the asset
		// minimizer owns that one.
		expect(read("bundle0.css")).toContain("color   :   #0000ff");
	}
};
