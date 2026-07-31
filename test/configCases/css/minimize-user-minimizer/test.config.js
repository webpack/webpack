"use strict";

const fs = require("fs");
const path = require("path");

module.exports = {
	findBundle() {
		return ["bundle0.js"];
	},
	afterExecute(options) {
		const read = (name) =>
			fs.readFileSync(path.join(options.output.path, name), "utf8");

		// Both webpack's own stylesheet and the copied one reach the configured
		// minimizer unminified: the marker is there and the source line breaks
		// survive, so webpack's built-in CSS minifier never ran.
		const own = read("bundle0.css");
		const copied = read("copied.css");

		expect(own.startsWith("/*user*/")).toBe(true);
		expect(own).toContain("\n");
		expect(copied).toBe("/*user*/.copied {\n\tcolor : red ;\n}\n");
	}
};
