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

		// The branch under test: `experiments.css: true` is the explicit opt-in.
		expect(read("experiments.txt")).toBe(JSON.stringify(true));

		// Rendered by webpack itself.
		expect(read("bundle0.css")).toBe(".native{color:red}");

		// Emitted by another plugin and unclaimed, so the built-in minifier takes
		// it too — a copied stylesheet still gets minimized.
		expect(read("copied.css")).toBe(".copied{color:red}");

		// Already marked `minimized`, so a minimizer the user configured has
		// handled it — webpack must leave it exactly as it was.
		expect(read("already.css")).toBe(".already {\n\tcolor : red ;\n}\n");
	}
};
