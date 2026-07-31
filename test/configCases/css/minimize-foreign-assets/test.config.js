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

		// Rendered by `CssModulesPlugin`, so it carries the `css` asset-info marker
		// and the built-in minifier claims it.
		expect(read("bundle0.css")).toContain(".native{color:red}");

		// Emitted by another plugin: webpack never parsed it, so it must survive
		// byte-for-byte rather than being re-serialized by webpack's minifier.
		expect(read("foreign.css")).toBe(".foreign {\n\tcolor : red ;\n}\n");
	}
};
