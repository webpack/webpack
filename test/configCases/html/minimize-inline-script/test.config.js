"use strict";

const fs = require("fs");
const path = require("path");

module.exports = {
	findBundle(_i, options) {
		const files = fs.readdirSync(options.output.path);
		return files.includes("main.js") ? ["./main.js"] : undefined;
	},
	afterExecute(options) {
		const html = fs.readFileSync(
			path.join(options.output.path, "page.html"),
			"utf8"
		);

		expect(html).toMatchSnapshot();
		// What the snapshot alone would not guard. A classic script's top level is
		// the global scope, so a name another script calls has to survive.
		expect(html).toContain("sharedFn");
		// A module's top level is its own scope, so what nothing reaches may go.
		expect(html).not.toContain("dropped");
		// A data block and a type carrying a parameter — not an essence match — keep
		// every byte they were written with.
		expect(html).toContain("{{  each   item  }}");
		expect(html).toContain("var   notAnEssence   =   1 ;");
	}
};
