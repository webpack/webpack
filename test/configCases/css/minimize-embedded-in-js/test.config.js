"use strict";

const fs = require("fs");
const path = require("path");

module.exports = {
	findBundle() {
		return ["bundle0.js"];
	},
	afterExecute(options) {
		// The stylesheet that does become an asset is minified as it always was:
		// reaching the embedded one costs the emitted one nothing.
		const css = fs.readFileSync(
			path.join(options.output.path, "bundle0.css"),
			"utf8"
		);

		expect(css).toBe(".b{color:#0f0;padding:5px}");

		// And so is the JavaScript asset carrying the embedded one, by the same
		// plugin instance in the same run.
		const js = fs.readFileSync(
			path.join(options.output.path, "bundle0.js"),
			"utf8"
		);

		expect(js).toContain(".a{color:red;margin:10px}");
		expect(js.trimEnd()).not.toContain("\n");
	}
};
